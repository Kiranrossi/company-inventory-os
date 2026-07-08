import { spawn } from 'child_process';
import path from 'path';

export interface PipelineMatchedItem {
    product_name: string;
    requested_qty: number;
    available_quantity: number;
    low_stock_threshold: number;
    raw_names: string[];
}

export interface PipelineUnmatchedItem {
    raw_name: string;
    requested_qty: number;
    confidence: number;
    best_fuzzy_match: string | null;
}

export interface PipelineSkippedItem {
    raw_name: string;
    raw_qty: string;
    reason: string;
}

export interface PipelineResult {
    matched_items: PipelineMatchedItem[];
    unmatched_items: PipelineUnmatchedItem[];
    skipped_items: PipelineSkippedItem[];
}

/**
 * Runs the 3-stage python pipeline on a document.
 * 
 * @param filePath Absolute path to the document file (PDF or DOCX).
 * @param inventory Current master inventory list of products.
 * @param threshold Fuzzy matching threshold (0-100).
 * @returns Promise resolving to the pipeline matched, unmatched, and skipped items.
 */
export function runPipeline(
    filePath: string,
    inventory: any[],
    threshold = 75
): Promise<PipelineResult> {
    return new Promise((resolve, reject) => {
        const pythonBin = path.join(process.cwd(), 'venv', 'bin', 'python3');
        const scriptPath = path.join(process.cwd(), 'scripts', 'pipeline.py');
        
        const params = {
            filePath,
            inventory,
            threshold,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY || ''
        };
        
        const proc = spawn(pythonBin, [scriptPath]);
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            stdout += data;
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data;
        });
        
        proc.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python pipeline process exited with code ${code}`);
                console.error(`Pipeline Stderr: ${stderr}`);
                return reject(new Error(stderr.trim() || `Pipeline exited with code ${code}`));
            }
            
            try {
                const result = JSON.parse(stdout);
                if (result.error) {
                    return reject(new Error(result.error));
                }
                resolve(result);
            } catch (err) {
                console.error('Failed to parse Python stdout as JSON:', stdout);
                reject(new Error('Invalid JSON output received from pipeline.py'));
            }
        });
        
        // Write the inputs to standard input of the python process
        proc.stdin.write(JSON.stringify(params));
        proc.stdin.end();
    });
}
