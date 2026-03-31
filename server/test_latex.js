const https = require('https');
const fs = require('fs');

const testLatex = async () => {
    const mathString = "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}";
    
    // CodeCogs API path with white background and 300 dpi for high-res PDF embedding
    const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg_white\\space ${encodeURIComponent(mathString)}`;
    
    console.log("Fetching URL:", url);
    
    const req = https.get(url, (res) => {
        if (res.statusCode !== 200) {
            console.error("FAIL:", res.statusCode);
            return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync('math.png', buffer);
            console.log("SUCCESS! Wrote math.png");
        });
    });
    
    req.on('error', console.error);
};

testLatex();
