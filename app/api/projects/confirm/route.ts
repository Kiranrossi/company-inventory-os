import { NextResponse } from 'next/server';
import { processProjectConsumption } from '@/lib/stockManager';

export async function POST(request: Request) {
    try {
        const { projectName, materials } = await request.json();

        if (!projectName || !materials || materials.length === 0) {
            return NextResponse.json({ error: 'Invalid payload structure. Project name and materials are required.' }, { status: 400 });
        }

        // Safety fallback: if user has not yet configured their Supabase env keys
        // We mock a success to preserve the frontend flow experience visually.
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({
                success: true,
                isMock: true,
                project: { id: Date.now(), project_name: projectName, status: 'Simulated Success' }
            });
        }

        // Pass the payload to our critical business logic manager
        const project = await processProjectConsumption(projectName, materials);

        return NextResponse.json({ success: true, project });
    } catch (error: any) {
        console.error('Project Deduct/Confirm Error:', error);

        // Explicitly return a client-friendly error string to surface on the UI
        return NextResponse.json({
            error: error.message || 'An unknown error occurred while saving the project.'
        }, { status: 500 });
    }
}
