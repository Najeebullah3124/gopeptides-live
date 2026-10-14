export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: never[]) => unknown>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function timeAgo(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: Array<[number, string]> = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [s, label] of intervals) {
    const v = Math.floor(seconds / s);
    if (v >= 1) return `${v} ${label}${v !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/** Encode /uploads/... so nginx's static *.ext rule cannot 404 before Express. */
function uploadsViaApi(path: string): string {
  const token = btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const apiBase = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
  return `${apiBase}/files/${token}`;
}

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Brand product photos live in frontend public/products — not on the API host.
  // Encode the filename so names with spaces work on Linux/nginx (phones hit this harder).
  if (path.startsWith('/products/')) {
    const file = path.slice('/products/'.length);
    return `/products/${file.split('/').map(encodeURIComponent).join('/')}`;
  }
  // Production nginx try_files *.png|webp on /uploads → 404; serve via extension-free API path.
  if (path.startsWith('/uploads/')) return uploadsViaApi(path);
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
  if (!baseUrl) return path;
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function productImage(product: { images?: { url: string; isPrimary: boolean }[] }): string | null {
  if (!product.images || product.images.length === 0) return null;
  const url = (product.images.find((i) => i.isPrimary) || product.images[0]).url;
  return resolveImageUrl(url);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function stockStatus(stock: number): { label: string; color: string; pct: number } {
  if (stock <= 0) return { label: 'Out of stock', color: 'text-danger', pct: 0 };
  if (stock < 10) return { label: `Only ${stock} left`, color: 'text-danger', pct: 15 };
  if (stock < 30) return { label: 'Low stock', color: 'text-gold', pct: 40 };
  if (stock < 70) return { label: 'In stock', color: 'text-primary', pct: 70 };
  return { label: 'In stock', color: 'text-primary', pct: 100 };
}

/** Orders from the API sometimes carry shippingAddress as a JSON string instead of an object. */
export function parseShippingAddress<T>(address: T | string): T {
  return typeof address === 'string' ? (JSON.parse(address) as T) : address;
}

/** Order with shippingAddress normalised to an object (see parseShippingAddress). */
export function withParsedAddress<T extends { shippingAddress: unknown }>(order: T): T {
  return { ...order, shippingAddress: parseShippingAddress(order.shippingAddress) };
}
