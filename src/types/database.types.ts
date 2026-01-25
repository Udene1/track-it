export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            items: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    quantity: number
                    price: number
                    category: string | null
                    user_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    quantity?: number
                    price?: number
                    category?: string | null
                    user_id: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    quantity?: number
                    price?: number
                    category?: string | null
                    user_id?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            purchases: {
                Row: {
                    id: string
                    item_id: string
                    quantity_purchased: number
                    cost: number
                    purchase_date: string
                    supplier_name: string | null
                    user_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    item_id: string
                    quantity_purchased: number
                    cost: number
                    purchase_date?: string
                    supplier_name?: string | null
                    user_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    item_id?: string
                    quantity_purchased?: number
                    cost?: number
                    purchase_date?: string
                    supplier_name?: string | null
                    user_id?: string
                    created_at?: string
                }
            }
            sales: {
                Row: {
                    id: string
                    item_id: string
                    quantity_sold: number
                    total_amount: number
                    sale_date: string
                    customer_name: string | null
                    invoice_id: string
                    user_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    item_id: string
                    quantity_sold: number
                    total_amount: number
                    sale_date?: string
                    customer_name?: string | null
                    invoice_id?: string
                    user_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    item_id?: string
                    quantity_sold?: number
                    total_amount?: number
                    sale_date?: string
                    customer_name?: string | null
                    invoice_id?: string
                    user_id?: string
                    created_at?: string
                }
            }
            audit_logs: {
                Row: {
                    id: string
                    action: string
                    table_name: string
                    record_id: string
                    changed_by: string | null
                    changes: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    action: string
                    table_name: string
                    record_id: string
                    changed_by?: string | null
                    changes?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    action?: string
                    table_name?: string
                    record_id?: string
                    changed_by?: string | null
                    changes?: Json | null
                    created_at?: string
                }
            }
        }
    }
}
