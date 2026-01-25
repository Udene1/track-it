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
        .select('sale_date, total_amount, quantity_sold, item_id, items(name, price)')
        .order('sale_date', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedData = sales.map(sale => ({
        date: sale.sale_date,
        item: sale.items?.name,
        quantity: sale.quantity_sold,
        revenue_inc_vat: sale.total_amount,
        revenue_ex_vat: Number(sale.total_amount) / 1.075,
        vat_amount: Number(sale.total_amount) - (Number(sale.total_amount) / 1.075),
    }));

    return NextResponse.json(formattedData);
}
