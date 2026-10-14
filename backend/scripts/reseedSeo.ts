import { execSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '..');
const steps = ['clearAllSeoGarbage.ts', 'fixLocalhostSeoUrls.ts', 'dedupeSeo.ts', 'seedSeoMetadata.ts'];

for (const script of steps) {
  console.log(`\n=== ${script} ===\n`);
  execSync(`npx tsx scripts/${script}`, { cwd: root, stdio: 'inherit' });
}

console.log('\nSEO reseed complete.');
