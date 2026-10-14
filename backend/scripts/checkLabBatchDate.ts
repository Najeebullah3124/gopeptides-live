/**
 * ponytail: GP-YYMMDD batch → display date used on /labresults.
 * Ceiling: assumes GoPeptides batch prefix only; upgrade if formats diversify.
 */
function dateFromBatchCode(batch?: string | null): string | null {
  const m = String(batch || '').match(/GP-(\d{2})(\d{2})(\d{2})(?:-|$)/i);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `${dd}-${mm}-20${yy}`;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(dateFromBatchCode('GP-260528-001') === '28-05-2026', 'CJC batch date');
assert(dateFromBatchCode('GP-TIRZ-15MG') === null, 'SKU is not a batch date');
assert(dateFromBatchCode('GP-260605-003') === '05-06-2026', '5-Amino batch date');

console.log('checkLabBatchDate: ok');
