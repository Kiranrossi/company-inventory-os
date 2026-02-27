// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export interface ParsedMaterial {
    product_name: string;
    quantity: number;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedMaterial[]> {
    try {
        const data = await pdf(buffer);
        const text = data.text;

        const lines = text.split('\n');
        const materials: ParsedMaterial[] = [];

        // Simple line-by-line parsing looking for standard work order format
        // Expected format: "Material Name - X" where X is a number
        lines.forEach((line: string) => {
            const match = line.match(/(.+?)\s*-\s*(\d+(\.\d+)?)/);
            if (match) {
                materials.push({
                    product_name: match[1].trim(),
                    quantity: parseFloat(match[2])
                });
            }
        });

        return materials;
    } catch (error) {
        console.error('Error in PDF parsing service:', error);
        throw new Error('Failed to read PDF text structure.');
    }
}
