import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // This route is intended to be called by a CRON job (e.g., Vercel Cron)
    // or manually by the user.

    try {
        const supabase = await createClient();

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch items for this user that are low on stock
        const { data: lowStockItems, error } = await supabase
            .from('items')
            .select('name, quantity')
            .lt('quantity', 10)
            .eq('user_id', user.id);

        if (error) throw error;

        if (!lowStockItems || lowStockItems.length === 0) {
            return NextResponse.json({ message: 'Stock levels are healthy.' });
        }

        // Prepare email content
        const itemListHtml = lowStockItems.map(item =>
            `<li><strong>${item.name}</strong>: ${item.quantity} units remaining</li>`
        ).join('');

        const { data, error: emailError } = await resend.emails.send({
            from: 'Tax1 Tracker <alerts@resend.dev>', // Replace with your verified domain in production
            to: user.email!,
            subject: '⚠️ Low Stock Alert - Tax1 Inventory',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #d32f2f;">Low Stock Warning</h2>
                    <p>Hello,</p>
                    <p>The following items in your inventory are running low (less than 10 units). Please consider restocking soon to avoid business disruption.</p>
                    <ul>
                        ${itemListHtml}
                    </ul>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">
                        This is an automated alert from your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://track-it-olive-delta.vercel.app/'}">Tax1 Inventory Tracker</a> dashboard.
                    </p>
                </div>
            `,
        });

        if (emailError) {
            console.error('Email Error:', emailError);
            return NextResponse.json({ error: 'Failed to send email alert' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Email alert sent successfully', emailId: data?.id });

    } catch (err: any) {
        console.error('Check Stock Cron Panic:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
