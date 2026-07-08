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
3
6952 Off White
0.8mm
1220x2440
6952 Off White
0.8mm
GreenLam 26
1
2 x 22mm 6952 Off
White Edgeband
45694.6000
millimetre
E31102
2 x 22mm 6952 Off
White Edgeband
GreenLam
2
2 x 22 mm 5375
Saturno walnut
Edgeband
68274.8000
millimetre
004R - Rehau, E3 -
2232 (Bristling
walnut light)
2 x 22 mm 5375
Saturno walnut
Edgeband
`;

const knownNames = [
    "8mm CSMR - Century Sainik",
    "16mm CSMR - Century Sainik MR",
    "6952 Off White 0.8mm",
    "2 x 22mm 6952 Off White Edgeband",
    "2 x 22 mm 5375 Saturno walnut Edgeband"
];

let normalizedText = text.replace(/[\r\n\t\s]+/g, ' ');
normalizedText = normalizedText.replace(/\b\d{2,4}\s*[xX*]\s*\d{2,4}\b/g, ' ');
normalizedText = normalizedText.replace(/\b[A-Za-z]+\d+[A-Za-z0-9-]*\b/g, ' ');

const materials = [];

for (const name of knownNames) {
    const normalizedName = name.replace(/[\r\n\t\s]+/g, ' ');
    if (normalizedText.includes(normalizedName)) {
        const parts = normalizedText.split(normalizedName);
        let totalQty = 0;

        for (let i = 1; i < parts.length; i += 2) {
            const part1 = parts[i] || '';
            const part2 = parts[i + 1] || '';
            let matchedRowQty = false;

            const match1 = part1.match(/\b\d+(?:\.\d+)?\b/);
            if (match1) {
                totalQty += parseFloat(match1[0]);
                matchedRowQty = true;
            }

            if (!matchedRowQty) {
                const match2 = part2.match(/\b\d+(?:\.\d+)?\b/);
                if (match2) {
                    totalQty += parseFloat(match2[0]);
                }
            }
        }
        if (totalQty > 0) {
            materials.push({ product_name: name, quantity: totalQty });
        }
    }
}
console.log(materials);
