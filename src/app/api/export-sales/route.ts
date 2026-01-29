import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Export sales data formatted for Tax1 P&L
    const { data: sales, error } = await supabase
        .from('sales')
        .select('sale_date, total_amount, quantity_sold, cost_at_sale, valuation_method_used, item_id, items(name, price)')
        .order('sale_date', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedData = sales.map(sale => {
        const costPrice = Number(sale.cost_at_sale || 0);
        const revenue = Number(sale.total_amount);
        const revenueExVat = revenue / 1.075;
        const cogs = costPrice * Number(sale.quantity_sold);
        const grossProfit = revenueExVat - cogs;

        return {
            date: sale.sale_date,
            item: (sale.items as any)?.name,
            quantity: sale.quantity_sold,
            revenue_inc_vat: revenue,
            revenue_ex_vat: revenueExVat,
            vat_amount: revenue - revenueExVat,
            cogs: cogs,
            gross_profit: grossProfit,
            valuation_method: sale.valuation_method_used || 'FIFO',
        };
    });

    return NextResponse.json(formattedData);
}
