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

        // Normalize text to handle multi-line cell wraps
        let normalizedText = originalText.replace(/[\r\n\t]+/g, ' ');

        // Pre-clean text to remove dimensions like "1220x2440" so they aren't incorrectly parsed as quantities
        normalizedText = normalizedText.replace(/\d{3,4}\s*[xX]\s*\d{3,4}/g, '');
        // Also remove alphanumeric catalog codes like E31102 to avoid parsing confusion
        normalizedText = normalizedText.replace(/\b[A-Za-z]+\d+\b/g, '');

        if (knownNames.length > 0) {
            for (const name of knownNames) {
                if (normalizedText.includes(name)) {
                    // Start looking after the *last* occurrence of the name
                    const parts = normalizedText.split(name);
                    const stringAfter = parts[parts.length - 1];

                    // Match the first standalone number that appears.
                    // This generously skims past words like "Generic" or "GreenLam" to find the trailing numeric quantity
                    const match = stringAfter.substring(0, 200).match(/[^\d]*?(\d+(?:\.\d+)?)/);

                    let qty = 1; // Fallback quantity
                    if (match && match[1]) {
                        qty = parseFloat(match[1]);
                    }

                    materials.push({
                        product_name: name,
                        quantity: qty
                    });
                }
            }
        }

        // Legacy fallback 
        if (materials.length === 0) {
            const lines = originalText.split('\n');
            lines.forEach((line: string) => {
                const match = line.match(/(.+?)\s*-\s*(\d+(\.\d+)?)/);
                if (match) {
                    materials.push({
                        product_name: match[1].trim(),
                        quantity: parseFloat(match[2])
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
