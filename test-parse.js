const text = `
N o. Core Material Dimension (W x D) ERP Code Model no Brand Quantity
1
8mm CSMR -
Century Sainik
1220x2440
8mm CSMR -
Century Sainik
Generic 2
2
16mm CSMR -
Century Sainik MR
1220x2440
16mm CSMR -
Century Sainik MR
Generic 17
`;

const knownNames = [
  "8mm CSMR - Century Sainik",
  "16mm CSMR - Century Sainik MR"
];

const materials = [];
let normalizedText = text.replace(/[\r\n\t\s]+/g, ' ');

console.log("Normalized text: ", normalizedText);

for (const name of knownNames) {
    const normalizedName = name.replace(/[\r\n\t\s]+/g, ' ');
    console.log("Looking for: ", normalizedName);
    
    // We can use regex to find all occurrences
    // Split the text by the normalized name to see what is after it
    let parts = normalizedText.split(normalizedName);
    if (parts.length > 1) {
        console.log("Found matches for:", name, "parts length:", parts.length);
        // We could just take the last part? 
        // Or if it repeats, each occurrence might have a quantity? No, usually the last one in the row, or the row has one quantity.
        // Wait, in the PDF the name appears TWICE per row! "Core Material" column and "Model no" column!
        // The quantity is after the second one!
        
        let totalQty = 0;
        // Let's get the string after the last occurrence?
        // Wait, if there are multiple items on different rows, we need to be careful.
        // In the PDF, "8mm CSMR - Century Sainik" appears as material and model. The quantity is "Generic 2".
        
        // Actually, let's just find the last match of the name.
        const stringAfter = parts[parts.length - 1];
        
        let cleanedAfter = stringAfter.replace(/\d{3,4}\s*[xX*]\s*\d{3,4}/g, ' ');
        cleanedAfter = cleanedAfter.replace(/\b[A-Za-z]+\d+[A-Za-z0-9]*\b/g, ' ');
        
        const digitMatches = cleanedAfter.match(/\b\d+(?:\.\d+)?\b/g);
        console.log("digits after:", digitMatches);
        if (digitMatches && digitMatches.length > 0) {
            qty = parseFloat(digitMatches[0]); // first digit after the last occurrence
            materials.push({ product_name: name, quantity: qty });
        }
    }
}
console.log(materials);
