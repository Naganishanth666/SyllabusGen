const { buildPdf } = require('./server/src/services/pdfService');
const fs = require('fs');

const sampleSyllabus = {
    course_code: 'CSE1001',
    course_title: 'Digital Systems Design',
    department: 'CSE',
    duration: 45,
    syllabus_json: `
Course Outcomes:
1. Understand digital logic principles
2. Design combinational and sequential logic
3. Use VHDL/FPGA tools for digital design
4. Work effectively in design teams

CO-PEO Mapping Matrix:
| CO No. | Course Outcome Statement | PEO1 | PEO2 | PEO3 |
|---|---|---|---|---|
| CO1 | Understand digital logic principles | 3 | 1 | 0 |
| CO2 | Design combinational and sequential logic | 3 | 2 | 0 |
| CO3 | Use VHDL/FPGA tools for digital design | 2 | 3 | 1 |
| CO4 | Work effectively in design teams | 1 | 2 | 3 |

Module 1: Introduction
Duration: 5 hours
Topics:
• Binary Systems
• Boolean Algebra
• Gates

Textbooks:
• Morris Mano, Digital Design
`
};

const outputStream = fs.createWriteStream('test_syllabus.pdf');

buildPdf(
    sampleSyllabus,
    (chunk) => outputStream.write(chunk),
    () => {
        outputStream.end();
        console.log('PDF generated: test_syllabus.pdf');
    }
);
