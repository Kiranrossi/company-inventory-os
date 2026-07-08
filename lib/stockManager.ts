import { createClient } from '@supabase/supabase-js';
import { ParsedMaterial } from './pdfParser';

export async function processProjectConsumption(
    projectName: string,
    materials: ParsedMaterial[],
    confirmedBy = 'Nisha'
) {
    if (materials.length === 0) throw new Error('No materials to process.');

    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const isMockUrl = dbUrl.includes('placeholder') || dbUrl.includes('your_supabase');

    // Block deductions in mock/fallback mode to protect database integrity
    if (isMockUrl) {
        throw new Error('Deduction blocked: Master Inventory database is in mock fallback mode. Please configure active Supabase environment variables to enable deductions.');
    }

    if (!serviceKey) {
        throw new Error('Server misconfiguration: Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. Cannot bypass RLS.');
    }

    // Create a server-side only admin client to bypass RLS
    const adminSupabase = createClient(dbUrl, serviceKey);

    // Verify Supabase connection works before proceeding
    try {
        const { error } = await adminSupabase.from('products').select('id').limit(1);
        if (error) throw new Error(error.message);
    } catch (e: any) {
        throw new Error('Deduction blocked: Supabase database is unreachable or offline. Deductions can only be performed on a live Master Inventory.');
    }

    // 1. Check if same project/work order already processed to prevent duplicate deduction
    const { data: existingProject } = await adminSupabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .maybeSingle();

    if (existingProject) {
        throw new Error(`Project "${projectName}" has already been processed.`);
    }

    // 2. Validate all stock availability BEFORE making any deductions (Atomic-style check)
    const productsToDeduct: { product: any; item: ParsedMaterial }[] = [];
    for (const item of materials) {
        const { data: product, error } = await adminSupabase
            .from('products')
            .select('id, available_quantity, product_name')
            .eq('product_name', item.product_name)
            .single();

        if (error || !product) {
            throw new Error(`Product "${item.product_name}" does not exist in master inventory.`);
        }

        if (product.available_quantity < item.quantity) {
            throw new Error(`Insufficient stock for "${item.product_name}". Have ${product.available_quantity}, require ${item.quantity}.`);
        }

        productsToDeduct.push({ product, item });
    }

    // 3. Create the Project Log Entry in Supabase, recording who confirmed it
    const { data: project, error: projectError } = await adminSupabase
        .from('projects')
        .insert({ 
            project_name: projectName, 
            status: 'Success',
            confirmed_by: confirmedBy
        })
        .select()
        .single();

    if (projectError || !project) {
        console.error('Project insert error:', projectError);
        const errObj = {
            message: projectError?.message || 'Database Error: Failed to create project log.',
            code: projectError?.code,
            details: projectError?.details,
            hint: projectError?.hint
        };
        throw new Error(JSON.stringify(errObj));
    }

    // 4. Deduct Stock and Register Material Log (The actual execution)
    const completedUpdates: { product: any; item: ParsedMaterial }[] = [];

    for (const { product, item } of productsToDeduct) {
        const newQuantity = product.available_quantity - item.quantity;

        // Update product stock levels
        const { error: updateError } = await adminSupabase
            .from('products')
            .update({ available_quantity: newQuantity })
            .eq('id', product.id);

        if (updateError) {
            console.error(`Failed to deduct stock for ${item.product_name}. Rolling back...`);
            await rollbackTransaction(adminSupabase, project.id, completedUpdates);
            throw new Error(`Database Error: Failed to deduct stock for ${item.product_name}.`);
        }

        // Save to Audit Log
        const { error: materialError } = await adminSupabase
            .from('project_materials')
            .insert({
                project_id: project.id,
                product_id: product.id,
                quantity_used: item.quantity
            });

        if (materialError) {
            console.error(`Failed to write consumption log for ${item.product_name}. Rolling back...`);
            // Revert the stock we just updated for this specific item before general rollback
            await adminSupabase.from('products').update({ available_quantity: product.available_quantity }).eq('id', product.id);
            await rollbackTransaction(adminSupabase, project.id, completedUpdates);
            throw new Error(`Database Error: Failed to write consumption log for ${item.product_name}.`);
        }

        completedUpdates.push({ product, item });
    }

    return project;
}

// Transaction Rollback Utility
async function rollbackTransaction(adminSupabase: any, projectId: number, completedUpdates: { product: any; item: ParsedMaterial }[]) {
    console.log('Initiating transaction rollback for project', projectId);
    
    // 1. Revert stock for all successfully processed items
    for (const { product } of completedUpdates) {
        await adminSupabase.from('products')
            .update({ available_quantity: product.available_quantity })
            .eq('id', product.id);
    }
    
    // 2. Delete project_materials
    await adminSupabase.from('project_materials').delete().eq('project_id', projectId);
    
    // 3. Delete project row
    await adminSupabase.from('projects').delete().eq('id', projectId);
    
    console.log('Rollback complete.');
}
