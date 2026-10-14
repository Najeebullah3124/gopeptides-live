/**
 * ponytail: guards /uploads → /api/files token encoding used when nginx blocks *.ext on /uploads.
 * Ceiling: only path-prefix encoding; upgrade if signed/expiring media URLs are needed.
 */
function uploadsViaApiToken(path: string): string {
  const token = Buffer.from(path, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `/api/files/${token}`;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const sample = '/uploads/1785240178662-y3jah3-Bac_Water_10_ml.png';
const url = uploadsViaApiToken(sample);
assert(url.startsWith('/api/files/'), 'token URL prefix');
assert(!url.includes('.png'), 'no file extension in media proxy URL');

let b64 = url.slice('/api/files/'.length).replace(/-/g, '+').replace(/_/g, '/');
while (b64.length % 4) b64 += '=';
const decoded = Buffer.from(b64, 'base64').toString('utf8');
assert(decoded === sample, `round-trip failed: ${decoded}`);

console.log('checkUploadsMediaProxy: ok');
