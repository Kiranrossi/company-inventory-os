import { NextResponse } from 'next/server';
import { parsePDF } from '@/lib/pdfParser';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Convert Web File Object to Node Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse the PDF buffer to extract material quantities
        const materials = await parsePDF(buffer);

        if (materials.length === 0) {
            return NextResponse.json({
                error: 'No valid materials recognized in this document. Make sure it uses the "Item - Quantity" format.'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: materials,
            fileName: file.name
        });

    } catch (error: any) {
        console.error('PDF Upload/Parsing Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to process the PDF document.'
        }, { status: 500 });
    }
}
