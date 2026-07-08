#!/usr/bin/env python3
import os
import sys
import json
import re
import pandas as pd
from docling.document_converter import DocumentConverter

# Force PyTorch and model hubs to use standard local cache directories
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

def is_numeric(val):
    if val is None or pd.isna(val):
        return False
    # Clean and check if it represents a number
    s = str(val).strip()
    s = re.sub(r'(?:pcs|units|meters|mtrs?|mm)?$', '', s, flags=re.IGNORECASE).strip()
    try:
        float(s)
        return True
    except ValueError:
        return False

def clean_quantity(val):
    s = str(val).strip()
    # Extract first sequence of digits/dots
    match = re.search(r'\d+(?:\.\d+)?', s)
    if match:
        return float(match.group(0))
    raise ValueError(f"Could not parse '{val}' as quantity.")

def parse_document(file_path):
    """
    Stage 1: Document Parsing using IBM Docling.
    Extracts all tables and parses them into a raw list of items.
    """
    converter = DocumentConverter()
    result = converter.convert(file_path)
    
    parsed_items = []
    skipped_items = []
    
    for table_idx, table in enumerate(result.document.tables):
        df = table.export_to_dataframe()
        
        # Normalize columns
        columns = [str(c).strip().lower() for c in df.columns]
        
        qty_col_idx = -1
        name_col_idx = -1
        
        # 1. Identify Quantity column
        qty_keywords = ['qty', 'quantity', 'count', 'vol', 'req', 'requested', 'qnty']
        for kw in qty_keywords:
            for idx, col in enumerate(columns):
                if kw in col:
                    qty_col_idx = idx
                    break
            if qty_col_idx != -1:
                break
                
        # 2. Identify Name column
        name_keywords = ['sku name', 'product', 'item', 'description', 'desc', 'material', 'name', 'model', 'core']
        for kw in name_keywords:
            for idx, col in enumerate(columns):
                if kw in col and idx != qty_col_idx:
                    name_col_idx = idx
                    break
            if name_col_idx != -1:
                break
                
        # Fallback Name column index
        if name_col_idx == -1:
            if len(columns) > 1:
                name_col_idx = 1  # Default to second column (usually after No. or ID)
            else:
                name_col_idx = 0
                
        # Fallback Quantity column index - REMOVED to prevent phantom extractions from tables with Serial Numbers
        if qty_col_idx == -1:
            # If we couldn't confidently find a quantity column via headers, skip this table entirely.
            pass
                
        # If columns are invalid, skip this table
        if name_col_idx == qty_col_idx or name_col_idx >= len(columns) or qty_col_idx >= len(columns) or name_col_idx == -1 or qty_col_idx == -1:
            continue
            
        # Parse rows
        for _, row in df.iterrows():
            raw_name = str(row.iloc[name_col_idx]).strip()
            raw_qty = str(row.iloc[qty_col_idx]).strip()
            
            # Skip header lookalikes and empty rows
            if not raw_name or raw_name.lower() in ['', 'none', 'nan', 'null'] or raw_name.lower() in columns:
                continue

            # Heuristic: Reject extracted names that are clearly short model numbers (no spaces, contains numbers)
            if len(raw_name) <= 12 and not ' ' in raw_name and re.search(r'\d', raw_name):
                skipped_items.append({
                    "raw_name": raw_name,
                    "raw_qty": raw_qty,
                    "reason": "Extracted string looks like a Model Number instead of a descriptive SKU Name."
                })
                continue
                
            try:
                qty = clean_quantity(raw_qty)
                # Apply Edgeband length conversion logic if raw_name contains edgeband
                # If length is in mm (e.g. >= 10), convert it to meters
                if 'edgeband' in raw_name.lower() and qty >= 10:
                    qty = qty / 1000.0
                    
                parsed_items.append({
                    "raw_name": raw_name,
                    "requested_qty": qty
                })
            except Exception as e:
                skipped_items.append({
                    "raw_name": raw_name,
                    "raw_qty": raw_qty,
                    "reason": str(e)
                })
                
    return parsed_items, skipped_items

def match_items_to_inventory(parsed_items, inventory_products, threshold=75):
    """
    Stage 2: Fuzzy Matching using RapidFuzz.
    Normalizes string formatting (underscores, hyphens, spaces) before comparison.
    """
    from rapidfuzz import process, fuzz
    
    matched_items = []
    unmatched_items = []
    
    inventory_names = [p["product_name"] for p in inventory_products]
    inventory_by_name = {p["product_name"]: p for p in inventory_products}
    
    # Helper to normalize strings for comparison
    def normalize_str(s):
        s = str(s).lower().replace('_', ' ').replace('-', ' ')
        s = re.sub(r'\s+', ' ', s)
        return s.strip()
        
    # Map normalized inventory names to original product names
    norm_inventory = {}
    for name in inventory_names:
        norm_name = normalize_str(name)
        # Avoid duplicate keys if they normalize to same (though unique is guaranteed in DB)
        if norm_name not in norm_inventory:
            norm_inventory[norm_name] = name
            
    norm_inventory_list = list(norm_inventory.keys())
    
    for item in parsed_items:
        raw_name = item["raw_name"]
        requested_qty = item["requested_qty"]
        
        # Clean prefix digits/hyphens for better match accuracy
        clean_raw_name = re.sub(r'^\d+\s*[-.]\s*', '', raw_name).strip()
        norm_raw_name = normalize_str(clean_raw_name)
        
        res = process.extractOne(norm_raw_name, norm_inventory_list, scorer=fuzz.token_sort_ratio)
        if res:
            best_norm_match, score, _ = res
            best_match = norm_inventory[best_norm_match]
            if score >= threshold:
                matched_items.append({
                    "raw_name": raw_name,
                    "product_name": best_match,
                    "requested_qty": requested_qty,
                    "confidence": float(score),
                    "available_quantity": float(inventory_by_name[best_match].get("available_quantity", 0)),
                    "low_stock_threshold": float(inventory_by_name[best_match].get("low_stock_threshold", 0))
                })
            else:
                unmatched_items.append({
                    "raw_name": raw_name,
                    "requested_qty": requested_qty,
                    "confidence": float(score),
                    "best_fuzzy_match": best_match
                })
        else:
            unmatched_items.append({
                "raw_name": raw_name,
                "requested_qty": requested_qty,
                "confidence": 0.0,
                "best_fuzzy_match": None
            })
            
    return matched_items, unmatched_items

def llm_fallback(unmatched_items, inventory_products, api_key):
    """
    Stage 3: Claude LLM matching fallback.
    """
    if not unmatched_items or not api_key:
        return [], unmatched_items
        
    from anthropic import Anthropic
    
    client = Anthropic(api_key=api_key)
    inventory_names = [p["product_name"] for p in inventory_products]
    inventory_by_name = {p["product_name"]: p for p in inventory_products}
    
    still_unmatched = []
    newly_matched = []
    
    unmatched_list_str = "\n".join([f"- {item['raw_name']}" for item in unmatched_items])
    inventory_list_str = "\n".join([f"- {name}" for name in inventory_names])
    
    prompt = f"""You are a precise warehouse inventory matching assistant.
We have some raw item names extracted from a customer's work order that could not be fuzzy-matched.
Your task is to match each raw item name to its exact corresponding product name in our Master Inventory list, if a genuine match exists.

Official Master Inventory list:
{inventory_list_str}

Unmatched items to resolve:
{unmatched_list_str}

Instructions:
1. For each unmatched item, find the single best match in the Master Inventory list.
2. The match must be a genuine synonym or alternate description of the same physical product (e.g. "8mm Ply" -> "8mm CSMR - Century Sainik").
3. If no item in the list genuinely corresponds to the unmatched item, map it to null.
4. Do NOT invent new product names. The match must be an exact string from the official Master Inventory list.
5. Return your response in JSON format mapping the raw item name to the exact matched product name (or null).

Expected JSON format:
{{
  "mappings": [
    {{
      "raw_name": "...",
      "product_name": "..."
    }},
    ...
  ]
}}

Provide ONLY the raw JSON output inside code blocks. No other text.
"""
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0.0,
            system="You are a strict, precise system that only outputs JSON matching inventory records.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        text = response.content[0].text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            mappings = {m["raw_name"]: m["product_name"] for m in data.get("mappings", [])}
            
            # Map unmatched_items through the mappings returned by the LLM
            # Group unmatched items to match by raw_name
            unmatched_dict = {item["raw_name"]: item for item in unmatched_items}
            
            for raw_name, matched_name in mappings.items():
                if raw_name in unmatched_dict:
                    item = unmatched_dict[raw_name]
                    if matched_name and matched_name in inventory_by_name:
                        newly_matched.append({
                            "raw_name": raw_name,
                            "product_name": matched_name,
                            "requested_qty": item["requested_qty"],
                            "confidence": 100.0,  # Exact LLM matched
                            "available_quantity": float(inventory_by_name[matched_name].get("available_quantity", 0)),
                            "low_stock_threshold": float(inventory_by_name[matched_name].get("low_stock_threshold", 0))
                        })
                        # Remove from the dict since it matched
                        del unmatched_dict[raw_name]
            
            # Remaining in unmatched_dict are still unmatched
            still_unmatched = list(unmatched_dict.values())
        else:
            still_unmatched = unmatched_items
            
    except Exception as e:
        print(f"Claude API matching error: {e}", file=sys.stderr)
        still_unmatched = unmatched_items
        
    return newly_matched, still_unmatched

def main():
    try:
        # Read parameters from stdin
        input_data = json.loads(sys.stdin.read())
        
        file_path = input_data["filePath"]
        inventory = input_data["inventory"]  # List of products (dicts)
        threshold = input_data.get("threshold", 75)
        api_key = input_data.get("anthropicApiKey", None)
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Uploaded file not found: {file_path}")
            
        # STAGE 1: Parse tables
        parsed_items, skipped_items = parse_document(file_path)
        
        # STAGE 2: Fuzzy match
        matched_items, unmatched_items = match_items_to_inventory(parsed_items, inventory, threshold)
        
        # STAGE 3: LLM fallback (optional second pass)
        llm_matched_items, final_unmatched_items = llm_fallback(unmatched_items, inventory, api_key)
        
        # Combine matches
        all_matched_items = matched_items + llm_matched_items
        
        # Group matched items by canonical product_name to sum quantities
        grouped_matched = {}
        for item in all_matched_items:
            prod_name = item["product_name"]
            if prod_name not in grouped_matched:
                grouped_matched[prod_name] = {
                    "product_name": prod_name,
                    "requested_qty": 0.0,
                    "available_quantity": item["available_quantity"],
                    "low_stock_threshold": item["low_stock_threshold"],
                    # Maintain list of original raw names for reference
                    "raw_names": []
                }
            grouped_matched[prod_name]["requested_qty"] += item["requested_qty"]
            if item["raw_name"] not in grouped_matched[prod_name]["raw_names"]:
                grouped_matched[prod_name]["raw_names"].append(item["raw_name"])
                
        final_matched = list(grouped_matched.values())
        
        # Output JSON result
        output = {
            "matched_items": final_matched,
            "unmatched_items": final_unmatched_items,
            "skipped_items": skipped_items
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        import traceback
        error_output = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_output, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
