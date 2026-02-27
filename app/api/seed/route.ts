import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        // 1) Insert Categories
        const { data: catData, error: catErr } = await supabase.from('categories').upsert([
            { id: 1, category_name: 'Raw Materials' },
            { id: 2, category_name: 'Fasteners' },
            { id: 3, category_name: 'Consumables' }
        ]).select();

        if (catErr) {
            return NextResponse.json({ error: 'Failed inserting categories', details: catErr }, { status: 500 });
        }

        // 2) Insert Products
        const { data: prodData, error: prodErr } = await supabase.from('products').upsert([
            { id: 1, category_id: 1, product_name: 'Plywood 18mm', available_quantity: 100, low_stock_threshold: 10 },
            { id: 2, category_id: 1, product_name: 'Plywood 12mm', available_quantity: 50, low_stock_threshold: 15 },
            { id: 3, category_id: 1, product_name: 'Pine Wood 2x4', available_quantity: 120, low_stock_threshold: 50 },
            { id: 4, category_id: 2, product_name: 'Nails 2 inch', available_quantity: 500, low_stock_threshold: 100 },
            { id: 5, category_id: 2, product_name: 'Screws 1.5 inch', available_quantity: 1200, low_stock_threshold: 200 },
            { id: 6, category_id: 3, product_name: 'Wood Glue 5L', available_quantity: 20, low_stock_threshold: 5 },
            { id: 7, category_id: 3, product_name: 'Sandpaper 120G', available_quantity: 200, low_stock_threshold: 50 }
        ], { onConflict: 'product_name' }).select();

        if (prodErr) {
            return NextResponse.json({ error: 'Failed inserting products', details: prodErr }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Database seeded successfully!' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
