import assert from 'node:assert/strict';
import { publishErrors } from '../src/controllers/blogController';

const valid = {
  content: `<h2>Research context</h2><p>${'research '.repeat(500)}</p><img src="/uploads/article.webp" alt="Labeled research vial" />`,
  featuredImage: '/uploads/cover.webp',
  featuredImageAlt: 'Research peptide vial on a laboratory bench',
  seoTitle: 'Research peptide methods and evidence overview',
  seoDescription: 'A research-only overview of peptide methods, evidence quality, storage records, and study limitations for careful laboratory reading.',
};

assert.deepEqual(publishErrors(valid), []);
assert.ok(publishErrors({ ...valid, featuredImageAlt: '' }).includes('Featured image alt text is required'));
assert.ok(publishErrors({ ...valid, content: '<p>Too short.</p>' }).includes('Content must contain at least 500 words'));
console.log('Blog publish gate checks passed.');
