import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createClient } from '@/lib/supabase-server';
import { formatCurrency, VAT_RATE } from '@/lib/utils';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing sale ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: sale, error } = await supabase
        .from('sales')
        .select('*, items(*)')
        .eq('id', id)
        .single();

    if (error || !sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const chunks: any[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    return new Promise<NextResponse>((resolve) => {
        doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(
                new NextResponse(buffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="invoice-${id.slice(0, 8)}.pdf"`,
                    },
                })
            );
        });

        // Generate Invoice Content
        doc.fontSize(25).text('TAX1 INVENTORY', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('Sales Receipt / Invoice', { underline: true });
        doc.moveDown();

        doc.fontSize(12).text(`Date: ${new Date(sale.sale_date).toLocaleString()}`);
        doc.text(`Invoice ID: ${sale.invoice_id}`);
        doc.text(`Customer: ${sale.customer_name || 'Walk-in Customer'}`);
        doc.moveDown();

        // Table Header
        doc.text('Item Description', 50, doc.y, { width: 300 });
        doc.text('Qty', 350, doc.y);
        doc.text('Price', 400, doc.y);
        doc.text('Total', 480, doc.y);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Item Row
        const subtotal = Number(sale.items.price) * sale.quantity_sold;
        const vatAmount = subtotal * VAT_RATE;

        doc.text(sale.items.name, 50, doc.y, { width: 300 });
        doc.text(sale.quantity_sold.toString(), 350, doc.y);
        doc.text(`${Number(sale.items.price).toFixed(2)}`, 400, doc.y);
        doc.text(`${subtotal.toFixed(2)}`, 480, doc.y);

        doc.moveDown(2);
        doc.moveTo(400, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.text('Subtotal:', 400, doc.y);
        doc.text(`N ${subtotal.toLocaleString()}`, 480, doc.y, { align: 'right' });
        doc.moveDown();

        doc.text('VAT (7.5%):', 400, doc.y);
        doc.text(`N ${vatAmount.toLocaleString()}`, 480, doc.y, { align: 'right' });
        doc.moveDown();

        doc.fontSize(14).text('Total Amount:', 400, doc.y, { bold: true });
        doc.text(`N ${Number(sale.total_amount).toLocaleString()}`, 480, doc.y, { align: 'right', bold: true });

        doc.moveDown(3);
        doc.fontSize(10).text('Thank you for your business!', { align: 'center', italic: true });
        doc.text('Powered by Tax1 Inventory Tracker', { align: 'center' });

        doc.end();
    });
}
