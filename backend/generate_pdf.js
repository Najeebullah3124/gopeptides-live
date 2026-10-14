const fs = require('fs');
const puppeteer = require('puppeteer');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();

(async () => {
  const markdown = fs.readFileSync('../SEO_Center_Audit_Report.md', 'utf8');
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SEO Center Audit Report</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
        h1, h2, h3 { color: #1a202c; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        h1 { font-size: 24px; text-align: center; border-bottom: none; }
        h2 { font-size: 20px; margin-top: 30px; }
        p { margin: 10px 0; }
        ul { margin-bottom: 20px; }
        li { margin-bottom: 5px; }
        strong { color: #2d3748; }
      </style>
    </head>
    <body>
      ${md.render(markdown)}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: '../SEO_Center_Audit_Report.pdf', format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } });
  await browser.close();
  console.log('PDF generated successfully!');
})();
