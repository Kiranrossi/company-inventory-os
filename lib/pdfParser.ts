import { supabase } from './supabaseClient';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export interface ParsedMaterial {
    product_name: string;
    quantity: number;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedMaterial[]> {
    try {
        const data = await pdf(buffer);
        const originalText = data.text as string;

        const materials: ParsedMaterial[] = [];

        // Fetch valid product names from Supabase to ensure accurate exact matching
        const { data: products } = await supabase.from('products').select('product_name');
        const knownNames = products?.map(p => p.product_name) || [];

        // Clean multiline wraps by replacing ALL newlines, tabs, and multispaces with a single space.
        let normalizedText = originalText.replace(/[\r\n\t\s]+/g, ' ');

        // Pre-clean common dimensions (e.g. 1220x2440)
        normalizedText = normalizedText.replace(/\b\d{2,4}\s*[xX*]\s*\d{2,4}\b/g, ' ');

        // Pre-clean catalog strings starting with letter and number (e.g. E31102, C10, P10)
        normalizedText = normalizedText.replace(/\b[A-Za-z]+\d+[A-Za-z0-9-]*\b/g, ' ');

        if (knownNames.length > 0) {
            for (const name of knownNames) {
                const normalizedName = name.replace(/[\r\n\t\s]+/g, ' ');

                if (normalizedText.includes(normalizedName)) {
                    // Split by the name. A row in this PDF repeats the name twice: (Material, Model No)
                    const parts = normalizedText.split(normalizedName);
                    let totalQty = 0;

                    for (let i = 1; i < parts.length; i += 2) {
                        const part1 = parts[i] || '';         // The chunk right after the 1st occurrence
                        const part2 = parts[i + 1] || '';     // The chunk right after the 2nd occurrence (if exists)
                        let matchedRowQty = false;

                        // Check the inner part first (Edgeband lengths usually live here)
                        const match1 = part1.match(/\b\d+(?:\.\d+)?\b/);
                        if (match1) {
                            totalQty += parseFloat(match1[0]);
                            matchedRowQty = true;
                        }

                        // If nothing was in the inner part (Panels have dimension removed, so it's empty),
                        // check the outer part (Quantity usually lives here, e.g. "Generic 2")
                        if (!matchedRowQty) {
                            const match2 = part2.match(/\b\d+(?:\.\d+)?\b/);
                            if (match2) {
                                totalQty += parseFloat(match2[0]);
                            }
                        }
                    }

                    if (totalQty > 0) {
                        // Convert Edgeband lengths from mm to meters
                        const finalQty = name.toLowerCase().includes('edgeband') 
                            ? totalQty / 1000 
                            : totalQty;

                        materials.push({
                            product_name: name,
                            quantity: finalQty
                        });
                    }
                }
            }
        }

        // Legacy fallback 
        if (materials.length === 0) {
            const lines = originalText.split('\n');
            lines.forEach((line: string) => {
                const match = line.match(/(.+?)\s*-\s*(\d+(\.\d+)?)/);
                if (match) {
                    const parsedName = match[1].trim();
                    let parsedQty = parseFloat(match[2]);

                    // Convert Edgeband lengths from mm to meters
                    if (parsedName.toLowerCase().includes('edgeband')) {
                        parsedQty = parsedQty / 1000;
                    }

                    materials.push({
                        product_name: parsedName,
                        quantity: parsedQty
                    });
                }
            });
        }

        return materials;
    } catch (error) {
        console.error('Error in PDF parsing service:', error);
        throw new Error('Failed to read PDF text structure.');
    }
}
