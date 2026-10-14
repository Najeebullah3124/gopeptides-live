import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { Paper, Researcher, Assessor } from 'yoastseo';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { Thing, WithContext, Product } from 'schema-dts';

async function testSeoLibraries() {
  console.log('====================================================');
  console.log('🚀 DETAILED SEO LIBRARIES DIAGNOSTIC & TEST SCRIPT 🚀');
  console.log('====================================================\n');

  // 1. YOAST SEO TEST
  console.log('--- 1. YOASTSEO (Content & Readability Analysis) ---');
  console.log('Working: Analyzes text for SEO best practices like keyword density, sentence length, and readability.');
  
  const sampleHtml = `
    <h1>Benefits of BPC-157 Peptides</h1>
    <p>BPC-157 is a very powerful peptide. It is used by many athletes. It can help heal injuries faster. 
    However, you should always consult a doctor. The peptide BPC-157 is amazing for recovery.</p>
    <p>In this article, we will discuss BPC-157 and its benefits. BPC-157 is great.</p>
  `;
  
  const paper = new Paper(sampleHtml, {
    keyword: 'BPC-157',
    title: 'Benefits of BPC-157 Peptides',
    description: 'Learn about the amazing healing benefits of the BPC-157 peptide for athletes and recovery.',
    url: 'https://gopeptides.nl/blog/bpc-157'
  });
  
  const researcher = new Researcher(paper);
  const assessor = new Assessor(researcher);
  assessor.assess(paper);
  
  const results = assessor.getValidResults().map(r => ({
    text: r.text,
    score: r.score, // 1-9 (9 is best, 1 is worst)
    rating: r.score >= 7 ? '✅ SAHI (Good)' : (r.score >= 5 ? '⚠️ WARNING (OK)' : '❌ GALAT (Needs Fix)')
  }));

  console.log('Results for keyword "BPC-157":');
  results.forEach(r => console.log(`[${r.rating}] Score ${r.score}: ${r.text}`));
  console.log('Faida (Leverage): Use this to guide content writers to write better, more readable blog posts that Google loves.\n');

  // 2. CHEERIO TEST
  console.log('--- 2. CHEERIO (Server-side HTML Auditing) ---');
  console.log('Working: Parses raw HTML so we can check if SEO tags (H1, meta, alt) are present without needing a browser.');
  
  const pageHtml = `
    <html>
      <head>
        <title>Shop BPC-157</title>
        <meta name="description" content="Buy high quality BPC-157">
      </head>
      <body>
        <h1>BPC-157 10mg</h1>
        <img src="vial.jpg" alt="BPC-157 10mg Vial White Background">
        <img src="box.jpg"> <!-- Missing ALT -->
        <h2>Usage Instructions</h2>
      </body>
    </html>
  `;
  const $ = cheerio.load(pageHtml);
  const h1 = $('h1').text();
  const title = $('title').text();
  const desc = $('meta[name="description"]').attr('content');
  const images = $('img');
  let missingAlt = 0;
  images.each((_, img) => {
    if (!$(img).attr('alt')) missingAlt++;
  });

  console.log(`✅ H1 Found: "${h1}"`);
  console.log(`✅ Title Found: "${title}"`);
  console.log(`✅ Meta Description Found: "${desc}"`);
  console.log(missingAlt > 0 ? `❌ GALAT: ${missingAlt} image(s) missing 'alt' text!` : `✅ SAHI: All images have alt text.`);
  console.log('Faida (Leverage): Run this on every page automatically to catch missing tags before Google does.\n');


  // 3. SLUGIFY TEST
  console.log('--- 3. SLUGIFY (SEO-friendly URL Generation) ---');
  console.log('Working: Converts complex titles with spaces, special characters, and accents into clean URLs.');
  
  const rawTitle = ' BPC-157 (10mg) - The Ultimate Guide! 2026 & Beyond ';
  const cleanSlug = slugify(rawTitle, { lower: true, strict: true, trim: true });
  
  console.log(`Original Title : "${rawTitle}"`);
  console.log(`Clean SEO Slug : "${cleanSlug}"`);
  console.log('Faida (Leverage): Ensures URLs are readable by humans and Google. E.g., /blog/bpc-157-10mg-the-ultimate-guide instead of /blog/123?title=BPC%20157.\n');


  // 4. REACT-HELMET-ASYNC TEST
  console.log('--- 4. REACT-HELMET-ASYNC (Dynamic Meta Tags) ---');
  console.log('Working: Injects dynamic SEO tags (title, canonical, OG tags) into the React <head> based on the current page.');
  
  const helmetContext: any = {};
  renderToString(
    React.createElement(HelmetProvider, { context: helmetContext }, 
      React.createElement(Helmet, null, 
        React.createElement('title', null, 'Dynamic Product Page - GoPeptides'),
        React.createElement('meta', { property: 'og:title', content: 'Dynamic Product Page' }),
        React.createElement('link', { rel: 'canonical', href: 'https://gopeptides.nl/shop/dynamic' })
      )
    )
  );
  
  const { helmet } = helmetContext;
  console.log('Generated Tags for <head>:');
  console.log(helmet.title.toString());
  console.log(helmet.meta.toString());
  console.log(helmet.link.toString());
  console.log('Faida (Leverage): Allows Next.js/React SPA to have perfect per-page SEO tags for social sharing and search engines.\n');


  // 5. SCHEMA-DTS TEST
  console.log('--- 5. SCHEMA-DTS (Type-Safe JSON-LD) ---');
  console.log('Working: Forces developers to write Google-compliant Structured Data. If a required field is missing, the code will fail to compile.');
  
  const productSchema: WithContext<Product> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'BPC-157 10mg',
    image: 'https://gopeptides.nl/images/bpc.jpg',
    description: 'High purity BPC-157 peptide for research.',
    offers: {
      '@type': 'Offer',
      price: '45.00',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock'
    }
  };
  
  console.log('Generated JSON-LD:');
  console.log(JSON.stringify(productSchema, null, 2));
  console.log('Faida (Leverage): Adds rich snippets (stars, price, stock status) directly in Google Search results to increase click-through rate (CTR).\n');

  console.log('====================================================');
  console.log('✅ SCRIPT COMPLETE. Use these insights to boost SEO!');
  console.log('====================================================');
}

testSeoLibraries().catch(console.error);
