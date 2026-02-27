import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({ data: getMockLowStock(), isMock: true });
        }

        // Only get items where available_quantity is <= low_stock_threshold
        // But since Supabase doesn't support comparing two columns directly in a basic .select() easily without RPC,
        // we fetch everything and filter in edge logic (fine for this small private scale) OR we filter client side.
        // However, a simple raw SQL query or RPC is best. For now, doing it via edge logic for speed:
        const { data: products, error } = await supabase
            .from('products')
            .select(`
        id,
        product_name,
        available_quantity,
        low_stock_threshold,
        categories ( category_name )
      `);

        if (error) throw error;

        // Filter down to only those matching the threshold condition
        const lowStock = (products || []).filter(p => p.available_quantity <= p.low_stock_threshold)
            .sort((a, b) => a.available_quantity - b.available_quantity); // most critical first

        return NextResponse.json({ data: lowStock, isMock: false });
    } catch (error: any) {
        console.error('Low Stock API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch low stock', data: getMockLowStock() }, { status: 500 });
    }
}

function getMockLowStock() {
    const globalMockData = (globalThis as any).__MOCK_DB__ || [];

    if (globalMockData.length > 0) {
        return globalMockData
            .filter((p: any) => p.available_quantity <= p.low_stock_threshold)
            .sort((a: any, b: any) => a.available_quantity - b.available_quantity);
    }

    // Fallback just in case
    return [];
}
