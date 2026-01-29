import { z } from 'zod';

export const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string(),
    price: z.number().min(0, 'Price must be positive'),
    barcode: z.string(),
    category: z.string().min(1, 'Category is required'),
    quantity: z.number().int().min(0),
    base_unit: z.string().min(1, 'Base unit is required'),
    packaging_unit: z.string(),
    units_per_package: z.number().int().min(1),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

export const saleSchema = z.object({
    item_id: z.string().uuid(),
    quantity_sold: z.number().int().positive('Quantity must be greater than 0'),
    unit_type: z.enum(['base', 'package']),
    unit_quantity: z.number().int().positive('Quantity must be greater than 0'),
    customer_name: z.string(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;

export const purchaseSchema = z.object({
    item_id: z.string().uuid(),
    quantity_purchased: z.number().int().positive('Quantity must be greater than 0'),
    unit_type: z.enum(['base', 'package']),
    unit_quantity: z.number().int().positive('Quantity must be greater than 0'),
    cost: z.number().min(0, 'Cost must be positive'),
    new_selling_price: z.number().min(0, 'Price must be positive').optional(),
    supplier_name: z.string(),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
