/**
 * ponytail: Google reviews deep-link from Place ID.
 * Ceiling: search.google.com/local/reviews format; upgrade if Google changes review URLs.
 */
function googleBusinessReviewsUrl(placeId: string): string {
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const id = 'ChIJP40W2xoLxkcR1VHaE5jeXLw';
const url = googleBusinessReviewsUrl(id);
assert(url.includes('placeid=ChIJP40W2xoLxkcR1VHaE5jeXLw'), 'place id in query');
assert(!url.includes('share.google'), 'no share.google short link');
assert(url.startsWith('https://search.google.com/local/reviews?'), 'reviews path');

console.log('checkGoogleReviewsUrl: ok', url);
