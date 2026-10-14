const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../../frontend-build/src/pages');
const filesToFix = ['About.tsx', 'Blog.tsx', 'Contact.tsx', 'FAQ.tsx', 'Home.tsx', 'Privacy.tsx', 'ReviewsPage.tsx', 'Science.tsx', 'Shipping.tsx', 'Shop.tsx', 'Terms.tsx'];

for (const file of filesToFix) {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipped (not found): ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('keywords: pageSeo.editable?.focusKeywords')) {
    console.log(`Already fixed: ${file}`);
    continue;
  }
  
  const regex = /(description:\s*pageSeo\.editable\?\.description[^,\n]*)(,)?/;
  if (regex.test(content)) {
    content = content.replace(regex, `$1,\n    keywords: pageSeo.editable?.focusKeywords,`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Could not find description match in: ${file}`);
  }
}
