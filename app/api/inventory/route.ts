export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Ensure our mock database survives Next.js hot-reloads in development
let globalMockData = (globalThis as any).__MOCK_DB__;

if (!globalMockData) {
    globalMockData = [
        // Core materials
        { id: 1, product_name: '8mm CSMR - Century Sainik', available_quantity: 120, low_stock_threshold: 20, categories: { id: 1, category_name: 'Core materials' } },
        { id: 2, product_name: '16mm CSMR - Century Sainik MR', available_quantity: 45, low_stock_threshold: 15, categories: { id: 1, category_name: 'Core materials' } },
        { id: 3, product_name: '16mm CCP BWP Ply - Century Club Prime', available_quantity: 60, low_stock_threshold: 10, categories: { id: 1, category_name: 'Core materials' } },
        { id: 4, product_name: '19mm CCP BWP Ply - Century Club Prime', available_quantity: 35, low_stock_threshold: 10, categories: { id: 1, category_name: 'Core materials' } },
        { id: 5, product_name: '9mm CCP BWP Ply - Century Club Prime', available_quantity: 80, low_stock_threshold: 15, categories: { id: 1, category_name: 'Core materials' } },
        { id: 6, product_name: '16mm CS7 BWP Ply - Century Sainik', available_quantity: 50, low_stock_threshold: 10, categories: { id: 1, category_name: 'Core materials' } },
        { id: 7, product_name: '19mm CS7 BWP Ply - Century Sainik', available_quantity: 40, low_stock_threshold: 10, categories: { id: 1, category_name: 'Core materials' } },
        { id: 8, product_name: '9mm CS7 BWP Ply - Century Sainik', available_quantity: 90, low_stock_threshold: 15, categories: { id: 1, category_name: 'Core materials' } },

        // Finish materials
        { id: 9, product_name: '6952 Off White 0.8mm', available_quantity: 200, low_stock_threshold: 50, categories: { id: 2, category_name: 'Finish materials' } },
        { id: 10, product_name: '108 SUD Absolute white 1mm', available_quantity: 150, low_stock_threshold: 40, categories: { id: 2, category_name: 'Finish materials' } },
        { id: 11, product_name: '5375 SUD Saturno walnut 1mm', available_quantity: 130, low_stock_threshold: 30, categories: { id: 2, category_name: 'Finish materials' } },

        // Edge-bands
        { id: 12, product_name: '0.8 x 22 mm 6968 Woven Fabric Grey Edgeband', available_quantity: 500, low_stock_threshold: 100, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 13, product_name: '2 x 22 mm 6968 Woven Fabric Grey Edgeband', available_quantity: 450, low_stock_threshold: 100, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 14, product_name: '0.8 x 22 mm 6967 Woven fabric Edgeband', available_quantity: 300, low_stock_threshold: 80, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 15, product_name: '2 x 22 mm 6967 Woven fabric Edgeband', available_quantity: 320, low_stock_threshold: 80, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 16, product_name: '2 x 22 mm 6952 Off White Edgeband', available_quantity: 400, low_stock_threshold: 80, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 17, product_name: '2 x 22 mm 5375 Saturno walnut Edgeband', available_quantity: 250, low_stock_threshold: 60, categories: { id: 3, category_name: 'Edge-bands' } },
        { id: 18, product_name: '2 x 22 mm 108 Absolute white Edgeband', available_quantity: 380, low_stock_threshold: 80, categories: { id: 3, category_name: 'Edge-bands' } },

        // Hardware
        { id: 19, product_name: '8x40 Wooden Dowel', available_quantity: 2000, low_stock_threshold: 500, categories: { id: 4, category_name: 'Hardware' } },
        { id: 20, product_name: 'Minifix _ External', available_quantity: 1500, low_stock_threshold: 300, categories: { id: 4, category_name: 'Hardware' } },
        { id: 21, product_name: 'Minifix 40mm_Internal', available_quantity: 1200, low_stock_threshold: 300, categories: { id: 4, category_name: 'Hardware' } },
        { id: 22, product_name: 'MH-Minifix _ External', available_quantity: 800, low_stock_threshold: 200, categories: { id: 4, category_name: 'Hardware' } },
        { id: 23, product_name: 'MH_Minifix 40mm_Internal', available_quantity: 750, low_stock_threshold: 200, categories: { id: 4, category_name: 'Hardware' } },
        { id: 24, product_name: 'Black Screw 3.5x19mm', available_quantity: 5000, low_stock_threshold: 1000, categories: { id: 4, category_name: 'Hardware' } },
        { id: 25, product_name: 'HETTICH SKIRTING LEG_100mm', available_quantity: 400, low_stock_threshold: 100, categories: { id: 4, category_name: 'Hardware' } },
        { id: 26, product_name: 'BZH(160)', available_quantity: 300, low_stock_threshold: 50, categories: { id: 4, category_name: 'Hardware' } },
        { id: 27, product_name: 'MH_Hinge with 0 crank,Opening angle 105', available_quantity: 600, low_stock_threshold: 150, categories: { id: 4, category_name: 'Hardware' } },
    ];
    (globalThis as any).__MOCK_DB__ = globalMockData;
}

function getMockData() {
    return (globalThis as any).__MOCK_DB__;
}

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({ data: getMockData(), isMock: true });
        }

        const { data: products, error } = await supabase
            .from('products')
            .select(`
        id,
        product_name,
        available_quantity,
        low_stock_threshold,
        categories ( id, category_name )
      `)
            .order('id');

        if (error || !products) {
            console.warn('Supabase query error or missing products array:', error?.message);
            return NextResponse.json({ data: getMockData(), isMock: true });
        }

        return NextResponse.json({ data: products, isMock: false });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ data: getMockData(), isMock: true, error: err.message });
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, available_quantity } = await request.json();

        // Safety check to return mock success if DB not configured yet
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase') || typeof id !== 'number') {
            const arr = (globalThis as any).__MOCK_DB__;
            const itemIndex = arr.findIndex((i: any) => i.id === id);
            if (itemIndex > -1) {
                arr[itemIndex].available_quantity = Number(available_quantity);
                (globalThis as any).__MOCK_DB__ = arr;
            }
            return NextResponse.json({ success: true, isMock: true });
        }

        const { data, error } = await supabase
            .from('products')
            .update({ available_quantity: Number(available_quantity) })
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            const newItem = {
                id: Date.now(),
                product_name: payload.product_name,
                available_quantity: Number(payload.available_quantity),
                low_stock_threshold: Number(payload.low_stock_threshold),
                categories: { id: 99, category_name: payload.category_name || 'Custom' }
            };
            const arr = (globalThis as any).__MOCK_DB__;
            arr.push(newItem);
            (globalThis as any).__MOCK_DB__ = arr;

            return NextResponse.json({ success: true, data: [newItem], isMock: true });
        }

        // Ensure Category exists and get ID
        const { data: catData, error: catError } = await supabase
            .from('categories')
            .select('id')
            .eq('category_name', payload.category_name)
            .single();

        if (catError || !catData) {
            throw new Error('Category not found or database configuration error.');
        }

        const { data, error } = await supabase
            .from('products')
            .insert({
                product_name: payload.product_name,
                available_quantity: Number(payload.available_quantity),
                low_stock_threshold: Number(payload.low_stock_threshold),
                category_id: catData.id
            })
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = Number(searchParams.get('id'));

        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase') || !id) {
            let arr = (globalThis as any).__MOCK_DB__;
            arr = arr.filter((i: any) => i.id !== id);
            (globalThis as any).__MOCK_DB__ = arr;
            return NextResponse.json({ success: true, isMock: true });
        }

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
