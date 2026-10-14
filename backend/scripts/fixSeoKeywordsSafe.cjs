const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../frontend-build/src/pages');
const filesToFix = ['About.tsx', 'Blog.tsx', 'FAQ.tsx', 'Privacy.tsx', 'ReviewsPage.tsx', 'Science.tsx', 'Shipping.tsx', 'Shop.tsx', 'Home.tsx', 'Contact.tsx', 'Terms.tsx'];

for (const file of filesToFix) {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Restore file first to avoid compounded errors if we run it multiple times? No, we just git checked out.
  // We want to add:
  // keywords: pageSeo.editable?.focusKeywords,
  // right after: description: ...
  
  if (content.includes('pageSeo.editable?.focusKeywords')) {
    console.log(`Already fixed: ${file}`);
    continue;
  }
  
  const regex = /(description:\s*pageSeo\.editable\?\.description\s*\|\|.*?)(,)?(\s*\n)/;
  if (regex.test(content)) {
    content = content.replace(regex, `$1,\n    keywords: pageSeo.editable?.focusKeywords,$3`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Could not find description match in: ${file}`);
  }
}
