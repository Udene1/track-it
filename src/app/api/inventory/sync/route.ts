import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Handle POST /api/inventory/sync
 * Receives stock updates from NEntreOS.
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.NENTREOS_API_KEY;

    // 1. Basic Auth Check
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const payload = await request.json();
        const { external_user_id, itemId, quantityChange, reason } = payload;

        if (!external_user_id || !itemId || quantityChange === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Identify Local User
        const { data: settings, error: settingsError } = await supabase
            .from('settings')
            .select('user_id, valuation_method')
            .eq('external_user_id', external_user_id)
            .single();

        if (settingsError || !settings) {
            return NextResponse.json({
                error: 'Identity Mapping Failed',
                details: `No local user found for external_user_id: ${external_user_id}`
            }, { status: 404 });
        }

        const userId = settings.user_id;

        // 3. Fetch Item Details
        const { data: item, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .eq('user_id', userId)
            .single();

        if (itemError || !item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        // 4. Handle Stock Update
        if (quantityChange > 0) {
            // INCREMENT: Log as a purchase/stock-in
            const { error: purchaseError } = await supabase
                .from('purchases')
                .insert([{
                    item_id: itemId,
                    quantity_purchased: quantityChange,
                    unit_type: 'base',
                    unit_quantity: quantityChange,
                    cost: 0, // In sync, we might not have cost info
                    supplier_name: reason || 'NEntreOS Sync (Increase)',
                    user_id: userId,
                }]);

            if (purchaseError) throw purchaseError;

        } else if (quantityChange < 0) {
            // DECREMENT: Log as a sale/stock-out
            const absoluteQty = Math.abs(quantityChange);

            if (item.quantity < absoluteQty) {
                return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
            }

            // A. Consume batches for FIFO tracking
            const { data: totalCost, error: cogsError } = await supabase.rpc('consume_stock_batches', {
                p_item_id: itemId,
                p_quantity_to_sell: absoluteQty,
                p_user_id: userId
            });

            if (cogsError) throw cogsError;

            // B. Calculate primary cost based on valuation method
            const fifo_cost = Number(totalCost) / absoluteQty;
            const wac_cost = Number(item.weighted_avg_cost) || 0;
            const costAtSale = settings.valuation_method === 'FIFO' ? fifo_cost : wac_cost;

            // C. Insert Sale record
            const { error: saleError } = await supabase
                .from('sales')
                .insert([{
                    item_id: itemId,
                    quantity_sold: absoluteQty,
                    unit_type: 'base',
                    unit_quantity: absoluteQty,
                    customer_name: reason || 'NEntreOS Sync (Decrease)',
                    total_amount: 0, // Sync might be an adjustment
                    fifo_cost: fifo_cost,
                    wac_cost: wac_cost,
                    cost_at_sale: costAtSale,
                    valuation_method_used: settings.valuation_method || 'FIFO',
                    user_id: userId,
                }]);

            if (saleError) throw saleError;
        }

        return NextResponse.json({
            success: true,
            message: 'Inventory synced successfully',
            newQuantity: item.quantity + quantityChange
        });

    } catch (err: any) {
        console.error('NEntreOS Sync Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
