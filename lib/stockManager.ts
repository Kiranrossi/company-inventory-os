import { supabase } from './supabaseClient';
import { ParsedMaterial } from './pdfParser';

export async function processProjectConsumption(projectName: string, materials: ParsedMaterial[]) {
    if (materials.length === 0) throw new Error('No materials to process.');

    // 1. Check if same project/work order already processed to prevent duplicate deduction
    const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('project_name', projectName)
        .single();

    if (existingProject) {
        throw new Error(`Project "${projectName}" has already been processed.`);
    }

    // 2. Validate all stock availability BEFORE making any deductions (Atomic-style check)
    for (const item of materials) {
        const { data: product } = await supabase
            .from('products')
            .select('id, available_quantity, product_name')
            .eq('product_name', item.product_name)
            .single();

        if (!product) {
            throw new Error(`Product "${item.product_name}" does not exist in master inventory.`);
        }

        if (product.available_quantity < item.quantity) {
            throw new Error(`Insufficient stock for "${item.product_name}". Have ${product.available_quantity}, require ${item.quantity}.`);
        }
    }

    // 3. Create the Project Log Entry
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ project_name: projectName, status: 'Success' })
        .select()
        .single();

    if (projectError || !project) {
        throw new Error('Database Error: Failed to create project log.');
    }

    // 4. Deduct Stock and Register Material Log (The actual execution)
    for (const item of materials) {
        // Re-fetch product to get its specific ID
        const { data: product } = await supabase
            .from('products')
            .select('id, available_quantity')
            .eq('product_name', item.product_name)
            .single();

        if (product) {
            // Safely Deduct
            await supabase
                .from('products')
                .update({ available_quantity: product.available_quantity - item.quantity })
                .eq('id', product.id);

            // Save to Audit Log
            await supabase
                .from('project_materials')
                .insert({
                    project_id: project.id,
                    product_id: product.id,
                    quantity_used: item.quantity
                });
        }
    }

    return project;
}
