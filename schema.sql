-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 0, -- Total in base_unit
  price DECIMAL(12, 2) DEFAULT 0.00, -- Selling price per base_unit
  barcode TEXT,
  category TEXT,
  base_unit TEXT DEFAULT 'Piece',
  packaging_unit TEXT,
  units_per_package INTEGER DEFAULT 1,
  weighted_avg_cost DECIMAL(12, 2) DEFAULT 0.00,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity_purchased INTEGER NOT NULL, -- Total in base_unit
  unit_type TEXT DEFAULT 'base', -- 'base' or 'package'
  unit_quantity INTEGER, -- Quantity in selected unit
  cost DECIMAL(12, 2) NOT NULL, -- Total cost for this purchase
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  supplier_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL, -- Total in base_unit
  unit_type TEXT DEFAULT 'base', -- 'base' or 'package'
  unit_quantity INTEGER, -- Quantity in selected unit
  total_amount DECIMAL(12, 2) NOT NULL,
  cost_at_sale DECIMAL(12, 2) DEFAULT 0.00, -- COGS per base unit at time of sale
  valuation_method_used TEXT DEFAULT 'FIFO', -- 'FIFO' or 'WAC'
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  customer_name TEXT,
  invoice_id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create stock_batches table for FIFO
CREATE TABLE IF NOT EXISTS stock_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity_initial INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  unit_cost DECIMAL(12, 2) NOT NULL,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  valuation_method TEXT DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO', 'WAC')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for items
CREATE POLICY "Users can manage their own items" ON items
  FOR ALL USING (auth.uid() = user_id);

-- Policies for purchases
CREATE POLICY "Users can manage their own purchases" ON purchases
  FOR ALL USING (auth.uid() = user_id);

-- Policies for sales
CREATE POLICY "Users can manage their own sales" ON sales
  FOR ALL USING (auth.uid() = user_id);

-- Policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = changed_by);

-- Policies for stock_batches
CREATE POLICY "Users can manage their own stock batches" ON stock_batches
  FOR ALL USING (auth.uid() = user_id);

-- Policies for settings
CREATE POLICY "Users can manage their own settings" ON settings
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at 
BEFORE UPDATE ON items 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_settings_updated_at 
BEFORE UPDATE ON settings 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Trigger for purchases: update items quantity
CREATE OR REPLACE FUNCTION handle_purchase_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update items total quantity
    UPDATE items SET quantity = quantity + NEW.quantity_purchased WHERE id = NEW.item_id;

    -- Create a stock batch for FIFO tracking
    INSERT INTO stock_batches (item_id, quantity_initial, quantity_remaining, unit_cost, purchase_id, user_id)
    VALUES (
      NEW.item_id, 
      NEW.quantity_purchased, 
      NEW.quantity_purchased, 
      NEW.cost / NEW.quantity_purchased, 
      NEW.id, 
      NEW.user_id
    );

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER purchase_stock_trigger 
AFTER INSERT ON purchases 
FOR EACH ROW EXECUTE PROCEDURE handle_purchase_stock();

-- Trigger for sales: update items quantity
CREATE OR REPLACE FUNCTION handle_sale_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items SET quantity = quantity - NEW.quantity_sold WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sale_stock_trigger 
AFTER INSERT ON sales 
FOR EACH ROW EXECUTE PROCEDURE handle_sale_stock();

-- Enable Realtime
-- First, check if the publication already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE items, sales, purchases;

-- Audit Logging Function
CREATE OR REPLACE FUNCTION audit_log_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action TEXT;
    v_changes JSONB;
BEGIN
    v_action := TG_OP;
    v_user_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_changes := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'DELETE') THEN
        v_changes := to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (action, table_name, record_id, changed_by, changes)
    VALUES (v_action, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), v_user_id, v_changes);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Triggers
DROP TRIGGER IF EXISTS audit_items_trigger ON items;
CREATE TRIGGER audit_items_trigger
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH ROW EXECUTE PROCEDURE audit_log_trigger_fn();

DROP TRIGGER IF EXISTS audit_sales_trigger ON sales;
CREATE TRIGGER audit_sales_trigger
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE PROCEDURE audit_log_trigger_fn();

DROP TRIGGER IF EXISTS audit_purchases_trigger ON purchases;
CREATE TRIGGER audit_purchases_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE PROCEDURE audit_log_trigger_fn();

-- FIFO Batch Consumption Logic
CREATE OR REPLACE FUNCTION consume_stock_batches(
  p_item_id UUID,
  p_quantity_to_sell INT,
  p_user_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
  v_remaining_to_sell INT := p_quantity_to_sell;
  v_batch RECORD;
  v_take INT;
  v_total_cost DECIMAL(12, 2) := 0;
BEGIN
  IF p_quantity_to_sell <= 0 THEN
    RETURN 0;
  END IF;

  FOR v_batch IN 
    SELECT * FROM stock_batches 
    WHERE item_id = p_item_id 
      AND user_id = p_user_id 
      AND quantity_remaining > 0 
    ORDER BY created_at ASC
  LOOP
    IF v_remaining_to_sell <= 0 THEN
      EXIT;
    END IF;

    v_take := LEAST(v_remaining_to_sell, v_batch.quantity_remaining);
    v_total_cost := v_total_cost + (v_take * v_batch.unit_cost);
    
    UPDATE stock_batches 
    SET quantity_remaining = quantity_remaining - v_take 
    WHERE id = v_batch.id;

    v_remaining_to_sell := v_remaining_to_sell - v_take;
  END LOOP;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
