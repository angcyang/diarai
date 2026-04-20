# -*- coding: utf-8 -*-
import zipfile
import re
import sys

# Open and parse the docx
try:
    with zipfile.ZipFile('e:/Project/20260417140811/DiarAI-Architecture.docx', 'r') as z:
        with z.open('word/document.xml') as f:
            content = f.read().decode('utf-8', errors='ignore')
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)

# Extract all text
texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', content)
text = ''.join(texts)

# Add newlines after Chinese punctuation
text = re.sub(r'([。！？；])', r'\1\n', text)
text = re.sub(r'\n{3,}', '\n\n', text)

# Write to file
with open('e:/Project/20260417140811/doc_content.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Extracted {len(text)} characters")
