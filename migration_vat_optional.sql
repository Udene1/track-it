-- Add vat_enabled to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS vat_enabled BOOLEAN DEFAULT TRUE;

-- Add vat_rate and vat_amount to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 4) DEFAULT 0.075;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(12, 2) DEFAULT 0.00;

-- Update existing sales to have the default VAT rate if they don't have it
-- (Note: This is a simplified migration. In a real scenario, we might want to calculate 
-- vat_amount from total_amount if it's already there, but since vat_amount is new, 
-- we'll just initialize it based on the assumption that total_amount included 7.5% VAT)
UPDATE sales SET vat_rate = 0.075, vat_amount = total_amount - (total_amount / 1.075) 
WHERE vat_amount = 0 AND total_amount > 0;
