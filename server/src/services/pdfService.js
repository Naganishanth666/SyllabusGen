const PDFDocument = require('pdfkit');
const zlib = require('zlib');
const https = require('https');

const fetchKrokiImage = (diagramText, type = 'mermaid') => {
    return new Promise((resolve) => {
        try {
            const buffer = Buffer.from(diagramText, 'utf8');
            const compressed = zlib.deflateSync(buffer);
            const encoded = compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
            const url = `https://kroki.io/${type}/png/${encoded}`;

            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    console.warn(`[PDF Builder] AI generated invalid diagram syntax. Kroki rejected with ${res.statusCode}. Handled safely.`);
                    return resolve(null);
                }
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('error', (err) => {
                console.warn('[PDF Builder] Kroki network error:', err.message);
                resolve(null);
            });

            req.on('timeout', () => {
                req.destroy();
                console.warn('[PDF Builder] Kroki server timeout (rate limit). Handled safely.');
                resolve(null);
            });

            req.setTimeout(2500); // Strict 2.5s rendering limit per diagram
        } catch(e) {
            console.error('Kroki encoding error:', e);
            resolve(null);
        }
    });
};

const fetchLatexImage = (mathString) => {
    return new Promise((resolve) => {
        try {
            // Clean up align tags that CodeCogs might struggle with if not wrapped
            let cleanMath = mathString.trim();
            const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg_white\\space ${encodeURIComponent(cleanMath)}`;

            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    console.warn(`[PDF Builder] CodeCogs rejected math with ${res.statusCode}.`);
                    return resolve(null);
                }
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });

            req.on('error', (err) => {
                console.warn('[PDF Builder] CodeCogs network error:', err.message);
                resolve(null);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(null);
            });

            req.setTimeout(4000); 
        } catch(e) {
            console.error('Latex encoding error:', e);
            resolve(null);
        }
    });
};

const buildPdf = (syllabus, dataCallback, endCallback) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    // --- Helper Functions ---
    const drawRow = (y, height, cols) => {
        let currentX = 40;
        cols.forEach((col) => {
            doc.rect(currentX, y, col.width, height).stroke();
            if (col.text) {
                doc.font(col.bold ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(col.fontSize || 10)
                    .text(col.text, currentX + 5, y + 5, { width: col.width - 10, align: col.align || 'left' });
            }
            currentX += col.width;
        });
    };

    // --- Robust Line-by-Line Parsing ---
    let plainText = syllabus.syllabus_json;
    if (typeof plainText === 'object') {
        plainText = JSON.stringify(plainText, null, 2);
    }
    plainText = plainText.replace(/\\n/g, '\n').replace(/\\r/g, '');

    const lines = plainText.split('\n');
    let currentSection = 'NONE';

    // Data stores
    let objectives = [];
    let outcomes = [];
    let mappingRows = [];
    let textbooks = [];
    let references = [];
    let modules = [];
    let caseStudies = [];
    let currentModule = null;

    // Regex for Section Headers
    // Regex for Section Headers (Anchored to start of line)
    const RE_OBJECTIVES = /^\s*(?:#{1,6}\s*)?(?:Course\s*)?Objectives/i;
    const RE_OUTCOMES = /^\s*(?:#{1,6}\s*)?(?:Course\s*)?Outcomes/i;
    const RE_MAPPING = /^\s*(?:#{1,6}\s*)?(?:CO-PEO\s*Mapping\s*Matrix|Mapping\s*Matrix)/i;
    const RE_TEXTBOOKS = /^\s*(?:#{1,6}\s*)?Textbooks/i;
    const RE_REFERENCES = /^\s*(?:#{1,6}\s*)?Reference\s*Books/i;
    const RE_CASE_STUDIES = /^\s*(?:#{1,6}\s*)?Case\s*Studies/i;
    const RE_MODULE_START = /(?:#{1,4}\s*)?Module\s*(\d+)[:\.]?\s*(.*)/i;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // Check for Module Start
        const modMatch = line.match(RE_MODULE_START);
        if (modMatch) {
            if (currentModule) modules.push(currentModule);

            currentModule = {
                number: modMatch[1],
                title: modMatch[2].trim(), // Might be empty if title is on next line
                duration: 'TBD',
                content: []
            };
            // Check if title is actually on this line or next. 
            // If modMatch[2] is just ":", clear it.
            if (currentModule.title && currentModule.title.match(/^[:\-\.]?$/)) {
                currentModule.title = '';
            }

            // Check if title contains duration like "Introduction (5 hours)"
            const titleDurMatch = currentModule.title.match(/(\d+)\s*(?:hours?|hrs?)/i);
            if (titleDurMatch) {
                currentModule.duration = titleDurMatch[1];
                currentModule.title = currentModule.title.replace(/\(?(\d+)\s*(?:hours?|hrs?)\)?/i, '').replace(/[-:]\s*$/, '').trim();
            }

            currentSection = 'MODULE';
            continue;
        }

        // Check for other sections with potential same-line content
        const checkSection = (regex, sectionName, listArray) => {
            const match = line.match(regex);
            if (match) {
                if (currentModule) { modules.push(currentModule); currentModule = null; }
                currentSection = sectionName;
                // If there is content after the header (e.g. "Textbooks: Book A"), add it
                let content = line.replace(regex, '').replace(/^[:\-\s#]+/, '').trim();
                // If content exists, add it (strip markdown)
                if (content && content.length > 2) {
                    // Split if comma separated
                    if (content.includes(',') && !content.includes(' - ')) {
                        listArray.push(...content.split(',').map(s => s.trim().replace(/\*\*/g, '')));
                    } else if (content.includes(' - ')) {
                        listArray.push(...content.split(' - ').map(s => s.trim().replace(/\*\*/g, '')));
                    } else {
                        listArray.push(content.replace(/\*\*/g, ''));
                    }
                }
                return true;
            }
            return false;
        };

        if (checkSection(RE_OBJECTIVES, 'OBJECTIVES', objectives)) continue;
        if (checkSection(RE_OUTCOMES, 'OUTCOMES', outcomes)) continue;
        if (checkSection(RE_MAPPING, 'MAPPING', [])) continue; // We handle table parsing differently
        if (checkSection(RE_CASE_STUDIES, 'CASE_STUDIES', caseStudies)) continue;
        if (checkSection(RE_TEXTBOOKS, 'TEXTBOOKS', textbooks)) continue;
        if (checkSection(RE_REFERENCES, 'REFERENCES', references)) continue;

        // Parse content based on current section
        // Strip bullets, bold, and markdown headers
        const cleanLine = line.replace(/^[-*•]\s*/, '')
            .replace(/\*\*/g, '')
            .replace(/^#{1,6}\s*/, '')
            .replace(/^[\]}]+$/, '')
            .trim();

        if (!cleanLine) continue;

        // Prevent "Module-wise Syllabus" or other headers from leaking into lists
        if (cleanLine.match(/Module-wise Syllabus|Overview of/i)) continue;

        if (currentSection === 'OBJECTIVES') {
            if (cleanLine) objectives.push(cleanLine);
        } else if (currentSection === 'OUTCOMES') {
            if (cleanLine) outcomes.push(cleanLine);
        } else if (currentSection === 'MAPPING') {
            if (line.includes('|') && !line.match(/--/)) {
                const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
                if (parts.length >= 4 && parts[0].match(/CO\d+/i)) {
                    mappingRows.push(parts);
                }
            }
        } else if (currentSection === 'CASE_STUDIES') {
            if (cleanLine) caseStudies.push(cleanLine);
        } else if (currentSection === 'TEXTBOOKS') {
            if (cleanLine) textbooks.push(cleanLine);
        } else if (currentSection === 'REFERENCES') {
            if (cleanLine) references.push(cleanLine);
        } else if (currentSection === 'MODULE' && currentModule) {
            // Capture Title if missing/empty
            if (!currentModule.title && !line.match(/Duration|Hours|Overview|Topics?/i)) {
                currentModule.title = line.replace(/^\*+/, '').replace(/\*+$/, '');
                const titleDurMatch = currentModule.title.match(/(\d+)\s*(?:hours?|hrs?)/i);
                if (titleDurMatch) {
                    currentModule.duration = titleDurMatch[1];
                    currentModule.title = currentModule.title.replace(/\(?(\d+)\s*(?:hours?|hrs?)\)?/i, '').replace(/[-:]\s*$/, '').trim();
                }
                continue;
            }

            // Capture Duration (even if on same line as content)
            const durMatch = line.match(/(?:Duration|Hours)[^0-9]*(\d+)/i) || line.match(/(\d+)\s*(?:hours?|hrs?)/i);
            if (durMatch) {
                if (currentModule.duration === 'TBD') {
                    currentModule.duration = durMatch[1];
                }
                // Always aggressively remove duration descriptors to prevent them from becoming syllabus bullet points
                line = line.replace(/(?:\*\*|)?(?:(?:Duration|Hours)[^0-9]*\d+\s*(?:hours?|hrs?)?|\b\d+\s*(?:hours?|hrs?)\b)(?:\*\*|)?[^a-zA-Z0-9]*/i, '');
            }

            // --- STRICT CLEANING FOR MODULE CONTENT ---

            // Aggressively skip internal metadata headers that LLM sometimes includes in the body
            // Matches: "- **Title:**", "Duration:", "Overview:", "Topics:", "Module 1:", "Case Studies:"
            const internalHeaderMatch = line.match(/^[-*•\s]*(?:\*\*|)?(?:Title|Duration|Overview|Topics?|Module\s*\d+|Case\s*Studies)(?:\*\*|)?:/i);

            if (internalHeaderMatch) {
                // Special case: If it's an "Overview" line, it might contain text we want to keep?
                // The user seems to want ONLY bullet points. So we skip Overview text entirely.
                // Exception: Check if "Topics:" line has content on the same line?
                const afterHeader = line.replace(/^[-*•\s]*(?:\*\*|)?(?:Title|Duration|Overview|Topics?|Module\s*\d+)(?:\*\*|)?:?\s*/i, '');

                // If it's "Topics: Topic 1, Topic 2", we might want to capture it.
                // But usually LLM puts them on new lines.
                // Let's assume strict bullet list behavior.
                continue;
            }

            // Strip markdown bold/italic and Clean Artifacts
            line = line.replace(/[\*_]{2,}/g, '')
                .replace(/^#{1,6}\s*/, '') // Remove ### headers
                .replace(/^[\]}]+$/, '')   // Remove closing braces
                .trim();

            // Remove leading dash/bullet
            line = line.replace(/^[-*•]\s*/, '');

            if (!line || line.length < 3) continue;

            // Split inline lists ("Topic A - Topic B")
            if (line.includes(' - ')) {
                const parts = line.split(' - ').map(p => p.trim()).filter(p => p.length > 2);
                currentModule.content.push(...parts);
            } else {
                currentModule.content.push(line);
            }
        }
    }
    // Push last module
    if (currentModule) modules.push(currentModule);


    // --- PDF Rendering ---
    let y = 40;

    // 1. Header Table
    drawRow(y, 25, [
        { width: 100, text: syllabus.course_code || 'CODE', bold: true },
        { width: 315, text: syllabus.course_title || 'TITLE', bold: true, align: 'center' },
        { width: 100, text: 'L  T  P  C', bold: true, align: 'center' }
    ]);
    y += 25;
    drawRow(y, 20, [
        { width: 100, text: 'Pre-requisite', bold: true },
        { width: 315, text: 'NIL', align: 'left' },
        { width: 100, text: '3  0  0  3', align: 'center' }
    ]);
    y += 20;
    drawRow(y, 20, [
        { width: 415, text: '' },
        { width: 100, text: 'Syllabus version\n1.0', align: 'center', fontSize: 8 }
    ]);
    y += 20;

    // 2. Objectives
    if (objectives.length > 0) {
        let objHeight = 20;
        doc.font('Helvetica').fontSize(10);
        objectives.forEach(obj => {
            objHeight += doc.heightOfString(`• ${obj}`, { width: 490 }) + 5;
        });
        if (y + objHeight > 780) { doc.addPage(); y = 40; }

        doc.font('Helvetica-Bold').fontSize(11).text('Course Objectives', 45, y + 5);
        doc.rect(40, y, 515, 20).stroke();
        y += 20;

        let startY = y;
        doc.font('Helvetica').fontSize(10);
        objectives.forEach(obj => {
            const height = doc.heightOfString(`• ${obj}`, { width: 490 });
            doc.text(`• ${obj}`, 50, y + 5, { width: 490 });
            y += height + 5;
        });
        doc.rect(40, startY, 515, y - startY).stroke();
    }

    // 3. Outcomes
    if (outcomes.length > 0) {
        let outHeight = 20;
        doc.font('Helvetica').fontSize(10);
        outcomes.forEach((out, i) => {
            const cleanedOut = out.replace(/^\d+[\.\)]?\s*/, '').replace(/^(?:CO\d+)[:\-\.]?\s*/i, '');
            const textToPrint = `${i + 1}. ${cleanedOut}`;
            outHeight += doc.heightOfString(textToPrint, { width: 490 }) + 5;
        });
        if (y + outHeight > 780) { doc.addPage(); y = 40; }

        doc.font('Helvetica-Bold').fontSize(11).text('Course Outcomes', 45, y + 5);
        doc.rect(40, y, 515, 20).stroke();
        y += 20;

        let startY = y;
        doc.font('Helvetica').fontSize(10);
        outcomes.forEach((out, i) => {
            const cleanedOut = out.replace(/^\d+[\.\)]?\s*/, '').replace(/^(?:CO\d+)[:\-\.]?\s*/i, '');
            const textToPrint = `${i + 1}. ${cleanedOut}`;
            const height = doc.heightOfString(textToPrint, { width: 490 });
            doc.text(textToPrint, 50, y + 5, { width: 490 });
            y += height + 5;
        });
        doc.rect(40, startY, 515, y - startY).stroke();
    }

    // 3.5 CO-PEO Mapping Matrix
    if (mappingRows.length > 0) {
        if (y > 650) { doc.addPage(); y = 40; }
        doc.font('Helvetica-Bold').fontSize(11).text('CO-PEO Mapping Matrix', 45, y + 5);
        doc.rect(40, y, 515, 20).stroke();
        y += 20;

        // Table Header
        drawRow(y, 25, [
            { width: 50, text: 'CO No.', bold: true, align: 'center' },
            { width: 265, text: 'Course Outcome Statement', bold: true, align: 'center' },
            { width: 65, text: 'PEO1', bold: true, align: 'center' },
            { width: 65, text: 'PEO2', bold: true, align: 'center' },
            { width: 70, text: 'PEO3', bold: true, align: 'center' }
        ]);
        y += 25;

        doc.font('Helvetica').fontSize(9);
        mappingRows.forEach(row => {
            if (y > 750) { doc.addPage(); y = 40; }
            const [co, statement, peo1, peo2, peo3] = row;
            const rowHeight = Math.max(doc.heightOfString(statement, { width: 255 }) + 10, 20);
            drawRow(y, rowHeight, [
                { width: 50, text: co, align: 'center' },
                { width: 265, text: statement },
                { width: 65, text: peo1, align: 'center' },
                { width: 65, text: peo2, align: 'center' },
                { width: 70, text: peo3, align: 'center' }
            ]);
            y += rowHeight;
        });
    }

    // 4. Modules
    modules.forEach(mod => {
        const contentText = mod.content.map(c => `• ${c}`).join('\n');
        doc.font('Helvetica').fontSize(10);
        const textHeight = doc.heightOfString(contentText, { width: 505 });
        const boxHeight = Math.max(textHeight + 10, 20);

        if (y + 25 + boxHeight > 780) { doc.addPage(); y = 40; }

        // Header
        drawRow(y, 25, [
            { width: 80, text: `Module:${mod.number}`, bold: true },
            { width: 355, text: mod.title, bold: true },
            { width: 80, text: `${mod.duration} hours`, align: 'right', bold: true }
        ]);
        y += 25;

        // Content
        doc.rect(40, y, 515, boxHeight).stroke();
        doc.text(contentText, 45, y + 5, { width: 505, align: 'left' });
        y += boxHeight;
    });

    // 5. Books
    if (y > 650) { doc.addPage(); y = 40; }

    // Text Books
    let tbText = textbooks.length > 0 ? textbooks.map(t => `• ${t}`).join('\n') : 'N/A';
    doc.font('Helvetica').fontSize(10);
    let tbHeight = doc.heightOfString(tbText, { width: 505 }) + 10;

    if (y + 20 + tbHeight > 780) { doc.addPage(); y = 40; }
    drawRow(y, 20, [{ width: 515, text: 'Text Book(s)', bold: true }]);
    y += 20;

    doc.rect(40, y, 515, tbHeight).stroke();
    doc.text(tbText, 45, y + 5, { width: 505 });
    y += tbHeight;

    // References
    let rbText = references.length > 0 ? references.map(r => `• ${r}`).join('\n') : 'N/A';
    doc.font('Helvetica').fontSize(10);
    let rbHeight = doc.heightOfString(rbText, { width: 505 }) + 10;

    if (y + 20 + rbHeight > 780) { doc.addPage(); y = 40; }
    drawRow(y, 20, [{ width: 515, text: 'Reference Books', bold: true }]);
    y += 20;

    doc.rect(40, y, 515, rbHeight).stroke();
    doc.text(rbText, 45, y + 5, { width: 505 });
    y += rbHeight;

    // 6. Case Studies (New Section)
    if (caseStudies.length > 0) {
        let csHeight = 20;
        doc.font('Helvetica').fontSize(10);
        caseStudies.forEach(cs => {
            csHeight += doc.heightOfString(`• ${cs}`, { width: 490 }) + 5;
        });

        if (y + csHeight > 780) { doc.addPage(); y = 40; }

        doc.font('Helvetica-Bold').fontSize(11).text('Case Studies / Projects', 45, y + 5);
        doc.rect(40, y, 515, 20).stroke();
        y += 20;

        let startY = y;
        doc.font('Helvetica').fontSize(10);
        caseStudies.forEach(cs => {
            const height = doc.heightOfString(`• ${cs}`, { width: 490 });
            doc.text(`• ${cs}`, 50, y + 5, { width: 490 });
            y += height + 5;
        });
        doc.rect(40, startY, 515, y - startY).stroke();
    }

    doc.end();
};

const buildNotesPdf = async (notesText, syllabusInfo, dataCallback, endCallback) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    const primaryColor = '#1e3a8a'; // Deep indigo/blue
    const secondaryColor = '#3b82f6'; // Bright blue
    const textColor = '#334155'; // Slate 700
    const lightBg = '#f8fafc'; // Slate 50

    // --- COVER PAGE ---
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
    
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(36)
       .text(syllabusInfo.course_title || 'Course Notes', 50, doc.page.height / 2 - 100, { align: 'center', width: doc.page.width - 100 });
       
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#93c5fd')
       .text(`${syllabusInfo.course_code || 'COURSE'} | ${syllabusInfo.department || 'General'}`, { align: 'center', width: doc.page.width - 100 });

    doc.moveDown(4);
    doc.fontSize(14).fillColor('#cbd5e1')
       .text('Comprehensive Study Materials', { align: 'center', width: doc.page.width - 100 });

    // Compress excessive empty lines to prevent blank pages
    let plainText = notesText;
    if (typeof plainText === 'object') {
        plainText = JSON.stringify(plainText, null, 2);
    }
    plainText = plainText.replace(/\\n/g, '\n').replace(/\\r/g, '');
    plainText = plainText.replace(/\n{3,}/g, '\n\n'); 
    
    const lines = plainText.split('\n');
    let lastWasEmpty = false;

    let inDiagram = false;
    let diagramType = 'mermaid';
    let diagramLines = [];

    for (const orgLine of lines) {
        let line = orgLine;
        
        // Failsafe abort: If we hit a core module dividing line or title while actively parsing a diagram, the AI forgot to close it. Force abort.
        if (inDiagram && (line.trim() === '---' || line.trim().match(/^#{1,3}\s/))) {
            inDiagram = false;
        }

        // Diagram block detection
        const diagramMatch = line.trim().match(/^```\s*(mermaid|mathjax|math|latex)/i);
        if (diagramMatch) {
            inDiagram = true;
            diagramType = diagramMatch[1].toLowerCase() === 'mermaid' ? 'mermaid' : 'mathjax';
            diagramLines = []; // Reset for new block
            continue;
        }
        
        if (inDiagram && line.trim().startsWith('```')) {
            inDiagram = false;
            let diagramText = diagramLines.join('\n');

            if (diagramText.trim()) {
                let imageBuffer = null;
                
                if (diagramType === 'mermaid') {
                    imageBuffer = await fetchKrokiImage(diagramText, 'mermaid');
                } else {
                    imageBuffer = await fetchLatexImage(diagramText);
                }

                if (imageBuffer) {
                    const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                    const imageMargin = 20; // Margin around the image
                    const targetWidth = availableWidth - (imageMargin * 2);

                    try {
                        const tempImage = doc.openImage(imageBuffer);
                        const origWidth = tempImage.width;
                        const origHeight = tempImage.height;

                        const maxWidth = availableWidth - 40; 
                        const maxHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom - 40;

                        let renderWidth = origWidth;
                        let renderHeight = origHeight;

                        // Never stretch a small image, but shrink it if it exceeds the page horizontal width
                        if (renderWidth > maxWidth) {
                            renderHeight = renderHeight * (maxWidth / renderWidth);
                            renderWidth = maxWidth;
                        }

                        // Also shrink it if it exceeds the page vertical height (e.g., massive sequence diagrams)
                        if (renderHeight > maxHeight) {
                            renderWidth = renderWidth * (maxHeight / renderHeight);
                            renderHeight = maxHeight;
                        }

                        // Check if we need a new page
                        if (doc.y + renderHeight > doc.page.height - doc.page.margins.bottom) {
                            doc.addPage();
                        }

                        // Center the image horizontally
                        const xOffset = doc.page.margins.left + (availableWidth - renderWidth) / 2;
                        
                        doc.moveDown(0.5);
                        doc.image(imageBuffer, xOffset, doc.y, { width: renderWidth, height: renderHeight });
                        doc.y += renderHeight + 15;
                    } catch (imageErr) {
                        console.warn('[PDF Builder] Failed to decode raw PNG buffer from Kroki. Safely discarding fragment.');
                        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text(`Failed to embed ${diagramType} diagram.`, { align: 'center' });
                        doc.moveDown(1);
                    }
                    doc.moveDown(1);
                } else {
                    doc.moveDown(0.5);
                    const safeText = diagramText.replace(/\\n/g, '\n');
                    doc.fillColor('#475569').font('Courier').fontSize(9).text(safeText, { align: 'left', width: doc.page.width - 100 });
                    doc.moveDown(1);
                }
            }
            continue;
        }

        if (inDiagram) {
            diagramLines.push(line);
            continue;
        }
        // End Diagram block detection

        if (!line.trim() && !line.startsWith('---')) {
            if (!lastWasEmpty) {
                doc.moveDown(0.5);
                lastWasEmpty = true;
            }
            continue;
        }
        lastWasEmpty = false;

        let cleanLine = line.replace(/\*\*/g, ''); 
        cleanLine = cleanLine.replace(/%/g, ''); 

        const headingMatch = cleanLine.match(/^(#+)\s*(.*)/);
        const bulletMatch = cleanLine.match(/^[-*•]\s+(.*)/);
        const hrMatch = cleanLine.match(/^---/);

        let level = 0;
        let contentText = cleanLine;

        if (headingMatch) {
            level = headingMatch[1].length;
            contentText = headingMatch[2];
        }

        const isModuleHeader = (level === 1 || level === 2) && /^module/i.test(contentText.trim());

        if (isModuleHeader) {
            doc.addPage();

            doc.rect(0, 0, doc.page.width, 10).fill(secondaryColor);
            
            doc.y = 50; 
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(24)
               .text(contentText, { underline: false });
            doc.moveDown(1);
        } else if (level === 1) {
            if (!/Comprehensive Notes/i.test(contentText)) {
                doc.moveDown(0.5);
                doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(20)
                   .text(contentText);
                doc.moveDown(0.5);
            }
        } else if (level === 2) {
            doc.moveDown(0.5);
            doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16)
               .text(contentText);
            doc.moveDown(0.5);
        } else if (level >= 3) {
            doc.moveDown(0.5);
            doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(14)
               .text(contentText);
        } else if (hrMatch) {
            continue;
        } else if (bulletMatch) {
            doc.fillColor(secondaryColor).font('Helvetica').fontSize(14).text('\u2022  ', { continued: true, indent: 20 })
               .fillColor(textColor).fontSize(11).text(bulletMatch[1].replace(/\*\*/g, '').replace(/%/g, ''), { continued: false });
        } else {
            doc.fillColor(textColor).font('Helvetica').fontSize(11).lineGap(4).text(cleanLine);
            doc.lineGap(0);
        }
    }

    // Add footers on all pages
    const pages = doc.bufferedPageRange();
    for (let i = 1; i < pages.count; i++) {
        doc.switchToPage(i);
        
        let oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // Temporarily disable bottom margin page breaks

        doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(lightBg);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica')
           .text(`${syllabusInfo.course_code || 'Course'} Notes  |  Page ${i}`, 50, doc.page.height - 25, { align: 'center', lineBreak: false });
           
        doc.page.margins.bottom = oldBottom;
    }

    doc.end();
};

module.exports = { buildPdf, buildNotesPdf };
