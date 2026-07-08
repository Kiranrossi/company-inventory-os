const http = require('http');

function request(url, options, bodyData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (bodyData) {
            req.write(JSON.stringify(bodyData));
        }
        req.end();
    });
}

async function runTest() {
    console.log('--- STARTING DEDUCTION SYNC INTEGRATION TEST ---\n');

    try {
        console.log('1. Fetching Master Inventory...');
        const inventoryRes = await request('http://localhost:3000/api/inventory', { method: 'GET' });
        
        if (inventoryRes.status !== 200) {
            throw new Error(`Failed to fetch inventory: ${JSON.stringify(inventoryRes.data)}`);
        }

        const isMockMode = inventoryRes.data.isMock;
        const products = inventoryRes.data.data;
        
        if (!products || products.length === 0) {
            throw new Error('No products found in inventory.');
        }

        // Pick a test product
        const targetProduct = products.find(p => p.product_name === '8mm CSMR - Century Sainik') || products[0];
        console.log(`Selected target product: "${targetProduct.product_name}"`);
        console.log(`Current Available Quantity: ${targetProduct.available_quantity}`);
        console.log(`Database Mode: ${isMockMode ? 'MOCK / FALLBACK' : 'LIVE SUPABASE'}\n`);

        const deductQty = 5;
        const testProjectName = `Sync-Test-${Date.now()}`;

        console.log(`2. Attempting to deduct ${deductQty} units for project: ${testProjectName}...`);
        
        const confirmRes = await request('http://localhost:3000/api/projects/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            projectName: testProjectName,
            materials: [{ product_name: targetProduct.product_name, quantity: deductQty }],
            confirmedBy: 'Automated Test Runner'
        });

        if (isMockMode) {
            console.log('\n--- VERIFYING MOCK BLOCKING BEHAVIOR ---');
            if (confirmRes.status === 400 && confirmRes.data.error?.includes('Deduction blocked')) {
                console.log('✅ SUCCESS: System correctly blocked deduction in Mock Mode to protect data integrity!');
                console.log('Server Error Message:', confirmRes.data.error);
            } else {
                console.error('❌ FAILED: System did not block mock deduction as expected.');
                console.error('Response:', confirmRes);
                process.exit(1);
            }
        } else {
            console.log('\n--- VERIFYING LIVE DEDUCTION SYNC BEHAVIOR ---');
            if (confirmRes.status !== 200) {
                console.error('❌ FAILED: Deduction failed unexpectedly in Live mode.');
                console.error('Response:', confirmRes);
                process.exit(1);
            }

            console.log('✅ SUCCESS: Deduction executed. Immediately re-fetching Master Inventory...');
            const finalInventoryRes = await request('http://localhost:3000/api/inventory', { method: 'GET' });
            const finalProducts = finalInventoryRes.data.data;
            const updatedProduct = finalProducts.find(p => p.product_name === targetProduct.product_name);

            const expectedQuantity = targetProduct.available_quantity - deductQty;
            console.log(`Expected Quantity: ${expectedQuantity}`);
            console.log(`Actual Quantity in Master DB: ${updatedProduct.available_quantity}`);

            if (updatedProduct.available_quantity === expectedQuantity) {
                console.log('✅ SUCCESS: Master Inventory reflects the deduction immediately. Single source of truth maintained.');
            } else {
                console.error('❌ FAILED: Quantity mismatch! Delay or multi-source issue detected.');
                process.exit(1);
            }
        }

        console.log('\n--- TEST COMPLETE ---');

    } catch (e) {
        console.error('Test Execution Error:', e);
        process.exit(1);
    }
}

runTest();
