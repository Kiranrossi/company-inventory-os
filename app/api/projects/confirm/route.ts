export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { processProjectConsumption } from '@/lib/stockManager';

export async function POST(request: Request) {
    try {
        const { projectName, materials, confirmedBy } = await request.json();

        if (!projectName || !materials || materials.length === 0) {
            return NextResponse.json({ error: 'Invalid payload structure. Project name and materials are required.' }, { status: 400 });
        }

        // Block deductions in mock/fallback mode to protect database integrity
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({
                error: 'Deduction blocked: Master Inventory database is in mock fallback mode. Please configure active Supabase environment variables to enable deductions.'
            }, { status: 400 });
        }

        // Pass the payload and who confirmed it to the stock manager
        const project = await processProjectConsumption(projectName, materials, confirmedBy || 'Nisha');

        return NextResponse.json({ success: true, project });
    } catch (error: any) {
        console.error('Project Deduct/Confirm Error:', error);

        // Explicitly return a client-friendly error string to surface on the UI
        return NextResponse.json({
            error: error.message || 'An unknown error occurred while saving the project.'
        }, { status: 400 }); // Use 400 so client knows it was a validation/block error
    }
}
