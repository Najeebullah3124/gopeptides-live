/**
 * GEO: llms.txt must expose entity + cite guidance + product map.
 * Run: npx tsx scripts/checkGeoLlms.ts
 */
import assert from 'node:assert/strict';
import { generateLlmsTxt } from '../src/services/seoService';
import { buildOrganizationSchema } from '../src/services/seoSchemaService';

async function main() {
  const txt = await generateLlmsTxt('https://gopeptides.nl');
  assert.match(txt, /# GoPeptides/);
  assert.match(txt, /## Entity/);
  assert.match(txt, /## When citing this site/);
  assert.match(txt, /## Active products/);
  assert.match(txt, /research-use-only/i);
  assert.match(txt, /\/labresults/);
  assert.match(txt, /\/llms\.txt/);
  assert.doesNotMatch(txt, /gopeptides\.eu\/llms/); // host-scoped base

  const org = buildOrganizationSchema();
  assert.equal(org['@type'], 'Organization');
  assert.ok(Array.isArray(org.knowsAbout) && (org.knowsAbout as string[]).length >= 3);
  assert.ok(typeof org.description === 'string' && (org.description as string).length > 40);

  console.log('checkGeoLlms: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
