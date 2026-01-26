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

    try {
        const supabase = await createClient();
        const { data: sale, error } = await supabase
            .from('sales')
            .select('*, items(*)')
            .eq('id', id)
            .single();

        if (error || !sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        // Defensive check for items relationship (Supabase join can sometimes return an array)
        const item = Array.isArray(sale.items) ? sale.items[0] : sale.items;

        if (!item) {
            return NextResponse.json({ error: 'Item details missing for this sale' }, { status: 404 });
        }

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        return new Promise<NextResponse>((resolve) => {
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('error', (err) => {
                console.error('PDF Generation Error:', err);
                resolve(NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 }));
            });

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
            doc.text(`Invoice ID: ${sale.invoice_id || 'N/A'}`);
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
            const itemPrice = Number(item.price) || 0;
            const subtotal = itemPrice * (sale.quantity_sold || 0);
            const vatAmount = subtotal * VAT_RATE;

            doc.text(item.name || 'Unknown Item', 50, doc.y, { width: 300 });
            doc.text((sale.quantity_sold || 0).toString(), 350, doc.y);
            doc.text(`${itemPrice.toFixed(2)}`, 400, doc.y);
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

            doc.fontSize(14).font('Helvetica-Bold').text('Total Amount:', 400, doc.y);
            doc.font('Helvetica-Bold').text(`N ${Number(sale.total_amount || 0).toLocaleString()}`, 480, doc.y, { align: 'right' });
            doc.font('Helvetica'); // Reset to standard font

            doc.moveDown(3);
            doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for your business!', { align: 'center' });
            doc.font('Helvetica'); // Reset font
            doc.text('Powered by Tax1 Inventory Tracker', { align: 'center' });

            doc.end();
        });
    } catch (err: any) {
        console.error('Invoice API Panic:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
