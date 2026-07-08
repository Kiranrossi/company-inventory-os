export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { runPipeline } from '@/lib/pipelineRunner';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileExtension = path.extname(file.name).toLowerCase();
        if (fileExtension !== '.pdf' && fileExtension !== '.docx') {
            return NextResponse.json({ error: 'Only PDF and DOCX files are supported.' }, { status: 400 });
        }

        // Convert Web File Object to Node Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a temp folder in the system temp directory (required for Vercel Serverless)
        const uploadsDir = path.join(os.tmpdir(), 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        const tempFilePath = path.join(uploadsDir, `${crypto.randomUUID()}${fileExtension}`);
        await fs.writeFile(tempFilePath, buffer);

        // Fetch current Master Inventory to feed to Python fuzzy matcher
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        let inventory: any[] = [];
        
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            inventory = (globalThis as any).__MOCK_DB__ || [];
        } else {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, product_name, available_quantity, low_stock_threshold')
                .order('id');
            if (error || !products) {
                console.warn('Supabase query failed during upload inventory fetch, using mock database:', error?.message);
                inventory = (globalThis as any).__MOCK_DB__ || [];
            } else {
                inventory = products;
            }
        }

        // Run the 3-stage python pipeline
        let pipelineResult;
        try {
            pipelineResult = await runPipeline(tempFilePath, inventory, 75);
        } finally {
            // Clean up temporary file
            try {
                await fs.unlink(tempFilePath);
            } catch (unlinkErr) {
                console.warn(`Failed to delete temp upload file at ${tempFilePath}:`, unlinkErr);
            }
        }

        if (pipelineResult.matched_items.length === 0 && pipelineResult.unmatched_items.length === 0) {
            return NextResponse.json({
                error: 'No valid materials recognized in this document. Make sure it has a valid table containing items and quantities.'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                matched_items: pipelineResult.matched_items,
                unmatched_items: pipelineResult.unmatched_items,
                skipped_items: pipelineResult.skipped_items
            },
            fileName: file.name
        });

    } catch (error: any) {
        console.error('Document Upload/Pipeline Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to process the uploaded document.'
        }, { status: 500 });
    }
}
