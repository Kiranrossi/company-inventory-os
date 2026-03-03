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

        // Split text line by line to correctly process tabular visual formats
        const lines = originalText.split('\n');

        if (knownNames.length > 0) {
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];

                for (const name of knownNames) {
                    if (line.includes(name)) {

                        // We might have multiline rows in PDFs. Concatenate the next line just in case the numbers wrapped.
                        if (i + 1 < lines.length) {
                            line += ' ' + lines[i + 1];
                        }

                        // 1. Remove the product name entirely so its internal numbers (e.g., 8mm) don't confuse us
                        let cleanedLine = line.split(name).join(' ');

                        // 2. Erase common dimensions (e.g., 1220x2440) 
                        cleanedLine = cleanedLine.replace(/\d{3,4}\s*[xX*]\s*\d{3,4}/g, ' ');

                        // 3. Erase alphanumeric catalog numbers (e.g., E31102) 
                        cleanedLine = cleanedLine.replace(/\b[A-Za-z]+\d+[A-Za-z0-9]*\b/g, ' ');

                        // 4. Find all remaining standalone numbers in the string
                        const digitMatches = cleanedLine.match(/\b\d+(?:\.\d+)?\b/g);

                        if (digitMatches && digitMatches.length > 0) {
                            // Pick the LAST number remaining on the row, which maps to Quantity or Length
                            const finalNumberStr = digitMatches[digitMatches.length - 1];
                            const qty = parseFloat(finalNumberStr);

                            const existing = materials.find(m => m.product_name === name);
                            if (existing) {
                                existing.quantity += qty;
                            } else {
                                materials.push({ product_name: name, quantity: qty });
                            }
                        }

                        // Break name search since we found the material for this block
                        break;
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
