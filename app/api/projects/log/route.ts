export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({
                data: getMockLogs(),
                isMock: true
            });
        }

        // Query projects with joined project_materials to display consumption
        const { data: projects, error } = await supabase
            .from('projects')
            .select(`
        id,
        project_name,
        upload_date,
        status,
        project_materials (
          quantity_used,
          products ( product_name )
        )
      `)
            .order('upload_date', { ascending: false });

        if (error) {
            console.warn('DB Log error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data: projects, isMock: false });
    } catch (error: any) {
        console.error('Fetch Logs error:', error);
        return NextResponse.json({ error: 'Failed to retrieve logs', data: getMockLogs() }, { status: 500 });
    }
}

// Fallback logic when Supabase isn't hooked up yet
function getMockLogs() {
    return [
        {
            id: 101,
            project_name: 'Work Order #A-20',
            upload_date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            status: 'Success',
            project_materials: [
                { quantity_used: 15, products: { product_name: 'Plywood 18mm' } },
                { quantity_used: 50, products: { product_name: 'Nails 2 inch' } }
            ]
        },
        {
            id: 102,
            project_name: 'Work Order #B-45',
            upload_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            status: 'Success',
            project_materials: [
                { quantity_used: 10, products: { product_name: 'Pine Wood 2x4' } }
            ]
        }
    ];
}
