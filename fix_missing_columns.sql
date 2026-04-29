-- SQL Migration: Comprehensive Database Repair
-- This script fixes missing columns, tables, functions, and triggers required for Inventory and Sales.
-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- 1. Create stock_batches table (Required for FIFO)
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

-- Enable RLS for stock_batches
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_batches' AND policyname = 'Users can manage their own stock batches') THEN
        CREATE POLICY "Users can manage their own stock batches" ON stock_batches
          FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Add missing columns to items, purchases, and sales
DO $$ 
BEGIN 
    -- Items table columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'items' AND COLUMN_NAME = 'barcode') THEN
        ALTER TABLE items ADD COLUMN barcode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'items' AND COLUMN_NAME = 'base_unit') THEN
        ALTER TABLE items ADD COLUMN base_unit TEXT DEFAULT 'Piece';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'items' AND COLUMN_NAME = 'packaging_unit') THEN
        ALTER TABLE items ADD COLUMN packaging_unit TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'items' AND COLUMN_NAME = 'units_per_package') THEN
        ALTER TABLE items ADD COLUMN units_per_package INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'items' AND COLUMN_NAME = 'weighted_avg_cost') THEN
        ALTER TABLE items ADD COLUMN weighted_avg_cost DECIMAL(12, 2) DEFAULT 0.00;
    END IF;

    -- Purchases table columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchases' AND COLUMN_NAME = 'unit_type') THEN
        ALTER TABLE purchases ADD COLUMN unit_type TEXT DEFAULT 'base';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'purchases' AND COLUMN_NAME = 'unit_quantity') THEN
        ALTER TABLE purchases ADD COLUMN unit_quantity INTEGER;
    END IF;

    -- Sales table columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'unit_type') THEN
        ALTER TABLE sales ADD COLUMN unit_type TEXT DEFAULT 'base';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'unit_quantity') THEN
        ALTER TABLE sales ADD COLUMN unit_quantity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'fifo_cost') THEN
        ALTER TABLE sales ADD COLUMN fifo_cost DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'wac_cost') THEN
        ALTER TABLE sales ADD COLUMN wac_cost DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'cost_at_sale') THEN
        ALTER TABLE sales ADD COLUMN cost_at_sale DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales' AND COLUMN_NAME = 'valuation_method_used') THEN
        ALTER TABLE sales ADD COLUMN valuation_method_used TEXT DEFAULT 'FIFO';
    END IF;

    -- Settings table columns
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'settings' AND COLUMN_NAME = 'barcode_enabled') THEN
        ALTER TABLE settings ADD COLUMN barcode_enabled BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add external_user_id for NEntreOS mapping
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'settings' AND COLUMN_NAME = 'external_user_id') THEN
        ALTER TABLE settings ADD COLUMN external_user_id TEXT UNIQUE;
    END IF;
END $$;

-- 3. Create FIFO Consumption Logic (Required for Sales)
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

-- 4. Re-establish Stock Triggers (Ensures inventory numbers match transactions)

-- Trigger for purchases: update items quantity and create batches
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

DROP TRIGGER IF EXISTS purchase_stock_trigger ON purchases;
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

DROP TRIGGER IF EXISTS sale_stock_trigger ON sales;
CREATE TRIGGER sale_stock_trigger 
AFTER INSERT ON sales 
FOR EACH ROW EXECUTE PROCEDURE handle_sale_stock();
