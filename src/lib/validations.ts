import { z } from 'zod';

export const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    barcode: z.string().optional(),
    category: z.string().min(1, 'Category is required'),
    quantity: z.number().int().min(0).optional(),
});

export type ItemFormValues = z.infer<typeof itemSchema>;

export const saleSchema = z.object({
    item_id: z.string().uuid(),
    quantity_sold: z.number().int().positive('Quantity must be greater than 0'),
    customer_name: z.string().optional(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;

export const purchaseSchema = z.object({
    item_id: z.string().uuid(),
    quantity_purchased: z.number().int().positive('Quantity must be greater than 0'),
    cost: z.number().min(0, 'Cost must be positive'),
    supplier_name: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
