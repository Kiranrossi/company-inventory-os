export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
// @ts-ignore
import pdfParse from 'pdf-parse';
// @ts-ignore
import mammoth from 'mammoth';
import Groq from 'groq-sdk';
import stringSimilarity from 'string-similarity';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileExtension = path.extname(file.name).toLowerCase();
        if (fileExtension !== '.pdf' && fileExtension !== '.docx') {
            return NextResponse.json({ error: 'Only PDF and DOCX files are supported.' }, { status: 400 });
        }

        // Convert Web File Object to Node Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Fetch current Master Inventory to feed to Python fuzzy matcher
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        let inventory: any[] = [];
        
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            inventory = (globalThis as any).__MOCK_DB__ || [];
        } else {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, product_name, available_quantity, low_stock_threshold')
                .order('id');
            if (error || !products) {
                console.warn('Supabase query failed during upload inventory fetch, using mock database:', error?.message);
                inventory = (globalThis as any).__MOCK_DB__ || [];
            } else {
                inventory = products;
            }
        }

        // 1. EXTRACT RAW TEXT FROM FILE
        let rawText = '';
        if (fileExtension === '.pdf') {
            const pdfData = await pdfParse(buffer);
            rawText = pdfData.text;
        } else {
            const docxData = await mammoth.extractRawText({ buffer });
            rawText = docxData.value;
        }

        // 2. EXTRACT TABLES VIA GROQ LLAMA 3
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `You are an expert data extraction tool. Given the raw text extracted from a hardware/materials order document, your task is to identify and extract the list of materials requested.
CRITICAL RULES:
1. ONLY extract items from tables that clearly represent materials/hardwares to be consumed (e.g., "Hardwares", "Materials List").
2. DO NOT extract items from summary tables, "List of Units", "Panels", or serial number lists. If a table does not have an explicit quantity, IGNORE IT.
3. For each item, extract the descriptive name (e.g., "8x40 Wooden Dowel", "Black Screw 3.5x19mm"). Prioritize "SKU Name", "Item Name", or "Description". DO NOT extract pure model codes (e.g., "WD840", "SC3.519") unless it's the only description available.
4. Clean the quantity to a pure number (e.g., "227 pcs" -> 227).

Output pure JSON. DO NOT include markdown formatting or markdown code blocks (no \`\`\`json). Return a JSON array of objects with keys "raw_name" and "requested_qty". Return an empty array [] if no valid materials are found.

Document Text:
${rawText}`;

        const response = await groq.chat.completions.create({
            model: 'llama3-70b-8192',
            temperature: 0,
            messages: [{ role: 'user', content: prompt }]
        });

        let extractedItems: {raw_name: string, requested_qty: number}[] = [];
        try {
            let jsonStr = (response.choices[0]?.message?.content || '').trim();
            if (jsonStr.startsWith('\`\`\`json')) jsonStr = jsonStr.substring(7);
            if (jsonStr.startsWith('\`\`\`')) jsonStr = jsonStr.substring(3);
            if (jsonStr.endsWith('\`\`\`')) jsonStr = jsonStr.substring(0, jsonStr.length - 3);
            extractedItems = JSON.parse(jsonStr.trim());
        } catch (err) {
            console.error('Failed to parse Groq JSON:', response.choices[0]?.message?.content);
            throw new Error('Failed to parse AI extraction results. Please try again.');
        }

        if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
            return NextResponse.json({
                error: 'No valid materials recognized in this document. Make sure it has a valid table containing items and quantities.'
            }, { status: 400 });
        }

        // 3. FUZZY MATCH AGAINST MASTER INVENTORY
        const threshold = 0.75; // 75%
        const matched_items: any[] = [];
        const unmatched_items: any[] = [];
        const skipped_items: any[] = [];
        
        // Helper to normalize strings for comparison
        const normalizeStr = (s: string) => {
            return String(s).toLowerCase().replace(/[-_]/g, ' ').replace(/\\s+/g, ' ').trim();
        };

        const inventoryNames = inventory.map(i => normalizeStr(i.product_name));

        for (const item of extractedItems) {
            if (!item.raw_name || typeof item.requested_qty !== 'number' || isNaN(item.requested_qty)) {
                skipped_items.push({ raw_name: item.raw_name || 'Unknown', raw_qty: String(item.requested_qty), reason: 'Invalid name or quantity' });
                continue;
            }

            const query = normalizeStr(item.raw_name);
            const matches = stringSimilarity.findBestMatch(query, inventoryNames);
            const bestMatch = matches.bestMatch;

            const confidence = bestMatch.rating; // 0.0 to 1.0
            const bestMatchIndex = inventoryNames.indexOf(bestMatch.target);
            const inventoryItem = inventory[bestMatchIndex];

            if (confidence >= threshold) {
                matched_items.push({
                    product_name: inventoryItem.product_name,
                    requested_qty: item.requested_qty,
                    available_quantity: inventoryItem.available_quantity,
                    low_stock_threshold: inventoryItem.low_stock_threshold,
                    raw_names: [item.raw_name]
                });
            } else {
                unmatched_items.push({
                    raw_name: item.raw_name,
                    requested_qty: item.requested_qty,
                    confidence: Math.round(confidence * 100),
                    best_fuzzy_match: inventoryItem.product_name
                });
            }
        }

        // Deduplicate matched items by product_name
        const mergedMatched: any[] = [];
        const matchedMap = new Map();
        for (const m of matched_items) {
            if (matchedMap.has(m.product_name)) {
                const existing = matchedMap.get(m.product_name);
                existing.requested_qty += m.requested_qty;
                if (!existing.raw_names.includes(m.raw_names[0])) {
                    existing.raw_names.push(m.raw_names[0]);
                }
            } else {
                matchedMap.set(m.product_name, m);
                mergedMatched.push(m);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                matched_items: mergedMatched,
                unmatched_items: unmatched_items,
                skipped_items: skipped_items
            },
            fileName: file.name
        });

    } catch (error: any) {
        console.error('Document Upload/Pipeline Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to process the uploaded document.'
        }, { status: 500 });
    }
}
