export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        // 1) Insert Categories
        const { data: catData, error: catErr } = await supabase.from('categories').upsert([
            { id: 1, category_name: 'Core materials' },
            { id: 2, category_name: 'Finish materials' },
            { id: 3, category_name: 'Edge-bands' },
            { id: 4, category_name: 'Hardware' }
        ]).select();

        if (catErr) {
            return NextResponse.json({ error: 'Failed inserting categories', details: catErr }, { status: 500 });
        }

        // 2) Insert Products
        const initialProducts = [
            // Core materials (id: 1)
            { id: 1, category_id: 1, product_name: '8mm CSMR - Century Sainik', available_quantity: 120, low_stock_threshold: 20 },
            { id: 2, category_id: 1, product_name: '16mm CSMR - Century Sainik MR', available_quantity: 45, low_stock_threshold: 15 },
            { id: 3, category_id: 1, product_name: '16mm CCP BWP Ply - Century Club Prime', available_quantity: 60, low_stock_threshold: 10 },
            { id: 4, category_id: 1, product_name: '19mm CCP BWP Ply - Century Club Prime', available_quantity: 35, low_stock_threshold: 10 },
            { id: 5, category_id: 1, product_name: '9mm CCP BWP Ply - Century Club Prime', available_quantity: 80, low_stock_threshold: 15 },
            { id: 6, category_id: 1, product_name: '16mm CS7 BWP Ply - Century Sainik', available_quantity: 50, low_stock_threshold: 10 },
            { id: 7, category_id: 1, product_name: '19mm CS7 BWP Ply - Century Sainik', available_quantity: 40, low_stock_threshold: 10 },
            { id: 8, category_id: 1, product_name: '9mm CS7 BWP Ply - Century Sainik', available_quantity: 90, low_stock_threshold: 15 },

            // Finish materials (id: 2)
            { id: 9, category_id: 2, product_name: '6952 Off White 0.8mm', available_quantity: 200, low_stock_threshold: 50 },
            { id: 10, category_id: 2, product_name: '108 SUD Absolute white 1mm', available_quantity: 150, low_stock_threshold: 40 },
            { id: 11, category_id: 2, product_name: '5375 SUD Saturno walnut 1mm', available_quantity: 130, low_stock_threshold: 30 },

            // Edge-bands (id: 3)
            { id: 12, category_id: 3, product_name: '0.8 x 22 mm 6968 Woven Fabric Grey Edgeband', available_quantity: 500, low_stock_threshold: 100 },
            { id: 13, category_id: 3, product_name: '2 x 22 mm 6968 Woven Fabric Grey Edgeband', available_quantity: 450, low_stock_threshold: 100 },
            { id: 14, category_id: 3, product_name: '0.8 x 22 mm 6967 Woven fabric Edgeband', available_quantity: 300, low_stock_threshold: 80 },
            { id: 15, category_id: 3, product_name: '2 x 22 mm 6967 Woven fabric Edgeband', available_quantity: 320, low_stock_threshold: 80 },
            { id: 16, category_id: 3, product_name: '2 x 22 mm 6952 Off White Edgeband', available_quantity: 400, low_stock_threshold: 80 },
            { id: 17, category_id: 3, product_name: '2 x 22 mm 5375 Saturno walnut Edgeband', available_quantity: 250, low_stock_threshold: 60 },
            { id: 18, category_id: 3, product_name: '2 x 22 mm 108 Absolute white Edgeband', available_quantity: 380, low_stock_threshold: 80 },

            // Hardware (id: 4)
            { id: 19, category_id: 4, product_name: '8x40 Wooden Dowel', available_quantity: 2000, low_stock_threshold: 500 },
            { id: 20, category_id: 4, product_name: 'Minifix _ External', available_quantity: 1500, low_stock_threshold: 300 },
            { id: 21, category_id: 4, product_name: 'Minifix 40mm_Internal', available_quantity: 1200, low_stock_threshold: 300 },
            { id: 22, category_id: 4, product_name: 'MH-Minifix _ External', available_quantity: 800, low_stock_threshold: 200 },
            { id: 23, category_id: 4, product_name: 'MH_Minifix 40mm_Internal', available_quantity: 750, low_stock_threshold: 200 },
            { id: 24, category_id: 4, product_name: 'Black Screw 3.5x19mm', available_quantity: 5000, low_stock_threshold: 1000 },
            { id: 25, category_id: 4, product_name: 'HETTICH SKIRTING LEG_100mm', available_quantity: 400, low_stock_threshold: 100 },
            { id: 26, category_id: 4, product_name: 'BZH(160)', available_quantity: 300, low_stock_threshold: 50 },
            { id: 27, category_id: 4, product_name: 'MH_Hinge with 0 crank,Opening angle 105', available_quantity: 600, low_stock_threshold: 150 },
        ];

        const { data: prodData, error: prodErr } = await supabase.from('products').upsert(initialProducts, { onConflict: 'id' }).select();

        if (prodErr) {
            return NextResponse.json({ error: 'Failed inserting products', details: prodErr }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Database seeded successfully with all 27 Master Materials!' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
