const fs = require('fs');
const xml = fs.readFileSync('e:/Project/20260417140811/unpacked_doc/word/document.xml', 'utf8');

// Extract all text between <w:t> tags
const texts = xml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
let result = [];
texts.forEach(t => {
    const m = t.match(/>([^<]+)</);
    if (m) result.push(m[1]);
});

const content = result.join('');
fs.writeFileSync('e:/Project/20260417140811/doc_content.txt', content);
console.log('Done:', content.length);
console.log('First 3000 chars:');
console.log(content.substring(0, 3000));
