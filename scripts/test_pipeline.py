#!/usr/bin/env python3
import os
import sys
import subprocess
import json

def main():
    # Make sure we are in the inventory-app directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(script_dir)
    os.chdir(app_dir)
    
    print("=== Running Pipeline Verification Script ===")
    
    # 1. Generate sample DOCX document if not exists
    sample_file = "tmp/sample_order.docx"
    python_bin = os.path.join("venv", "bin", "python3")
    
    if not os.path.exists(python_bin):
        print(f"Error: Python virtual environment not found at {python_bin}.", file=sys.stderr)
        print("Please wait for setup_pipeline.sh to finish.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(sample_file):
        print("Generating test document...")
        subprocess.run([python_bin, "scripts/generate_sample_docx.py"], check=True)
        
    # 2. Prepare mock inventory list
    mock_inventory = [
        {"product_name": "8mm CSMR - Century Sainik", "available_quantity": 120.0, "low_stock_threshold": 20.0},
        {"product_name": "16mm CSMR - Century Sainik MR", "available_quantity": 45.0, "low_stock_threshold": 15.0},
        {"product_name": "16mm CCP BWP Ply - Century Club Prime", "available_quantity": 60.0, "low_stock_threshold": 10.0},
        {"product_name": "2 x 22 mm 6952 Off White Edgeband", "available_quantity": 400.0, "low_stock_threshold": 80.0},
        {"product_name": "HETTICH SKIRTING LEG_100mm", "available_quantity": 400.0, "low_stock_threshold": 100.0},
        {"product_name": "Minifix", "available_quantity": 4250.0, "low_stock_threshold": 1000.0}
    ]
    
    # 3. Assemble parameters for the pipeline
    params = {
        "filePath": sample_file,
        "inventory": mock_inventory,
        "threshold": 75,
        "anthropicApiKey": os.getenv("ANTHROPIC_API_KEY", "")
    }
    
    # 4. Invoke pipeline.py via python virtual environment, passing params to stdin
    print("Invoking pipeline.py via stdin...")
    try:
        proc = subprocess.Popen(
            [python_bin, "scripts/pipeline.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=json.dumps(params))
        
        if proc.returncode != 0:
            print("Error: Pipeline script failed!", file=sys.stderr)
            print(f"Stderr:\n{stderr}", file=sys.stderr)
            sys.exit(1)
            
        # Parse and print output
        results = json.loads(stdout)
        print("\n=== PIPELINE PARSING RESULTS ===")
        print(json.dumps(results, indent=2))
        
        # Simple assertions for verification
        matched = results.get("matched_items", [])
        unmatched = results.get("unmatched_items", [])
        skipped = results.get("skipped_items", [])
        
        print("\n=== Verification Check ===")
        print(f"Matched Items Count: {len(matched)}")
        print(f"Unmatched Items Count: {len(unmatched)}")
        print(f"Skipped Items Count: {len(skipped)}")
        
        # Check conversion logic for Edgeband (1500mm -> 1.5m)
        edgeband_match = next((item for item in matched if "Edgeband" in item["product_name"]), None)
        if edgeband_match:
            qty = edgeband_match["requested_qty"]
            print(f"Edgeband Quantity: {qty} (Expected: 1.5)")
            if abs(qty - 1.5) < 0.01:
                print("✓ Edgeband mm-to-meters conversion works!")
            else:
                print("✗ Edgeband conversion failed!")
                
        # Check skipped items has the invalid quantity row
        invalid_qty_skip = next((item for item in skipped if "Invalid Quantity Row" in item["raw_name"]), None)
        if invalid_qty_skip:
            print("✓ Successfully skipped row with invalid quantity!")
        else:
            print("✗ Failed to skip row with invalid quantity!")
            
    except Exception as e:
        print(f"Error during verification: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
