const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../frontend-build/src/pages');
const files = ['Blog.tsx', 'FAQ.tsx', 'Privacy.tsx', 'ReviewsPage.tsx', 'Science.tsx', 'Shipping.tsx'];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('pageSeo.editable') && !content.includes('keywords: pageSeo.editable?.focusKeywords')) {
    // We want to find the useSEO({ ... }) block and insert the keywords line.
    // The easiest way is to find "description: pageSeo.editable?.description || ..." and replace it with itself + the new line.
    
    // Look for something like: description: pageSeo.editable?.description || t('something'),
    const match = content.match(/description:\s*pageSeo\.editable\?\.description\s*\|\|[^,\n]+/);
    
    if (match) {
      const originalLine = match[0];
      const withComma = content.includes(originalLine + ',') ? originalLine + ',' : originalLine;
      const newLine = `${withComma}\n    keywords: pageSeo.editable?.focusKeywords,`;
      
      content = content.replace(withComma, newLine);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`Could not match description line in ${file}`);
    }
  }
}
console.log('Done!');
