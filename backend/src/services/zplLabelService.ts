type OrderForLabel = {
  orderNumber: string;
  createdAt: Date;
  total: number;
  shippingAddress: Record<string, unknown>;
  items: Array<{ name: string; quantity: number }>;
};

/** ZPL uses ^ ~ and \ as control prefixes — strip them out of free-text field values. */
function zplSafe(value: unknown): string {
  return String(value ?? '').replace(/[\^~\\]/g, '');
}

/**
 * Builds a ZPL (Zebra Programming Language) shipping label for a 4x6" label at 203dpi —
 * the standard size/resolution for desktop Zebra shipping-label printers (GK420d, ZD420,
 * GC420d, etc). Sent as raw bytes directly to the printer's port 9100 by the local print
 * agent — no driver or PDF rendering needed, this is the printer's native command language.
 */
export function buildShippingLabelZpl(order: OrderForLabel): string {
  const addr = order.shippingAddress || {};
  const name = zplSafe(`${addr.firstName || ''} ${addr.lastName || ''}`.trim());
  const street = zplSafe(addr.street);
  const cityLine = zplSafe(`${addr.postalCode || ''} ${addr.city || ''}`.trim());
  const country = zplSafe(addr.country);
  const phone = addr.phone ? zplSafe(addr.phone) : '';
  const orderNumber = zplSafe(order.orderNumber);
  const date = zplSafe(new Date(order.createdAt).toLocaleDateString('nl-NL'));
  const itemLines = order.items
    .slice(0, 8) // 4x6 label has limited room — overflow items are still in the order record
    .map((i) => zplSafe(`${i.quantity}x ${i.name}`).slice(0, 42));

  const lines: string[] = [];
  lines.push('^XA');
  lines.push('^CI28'); // UTF-8 encoding, so accented characters (é, ö, etc.) print correctly
  lines.push('^PW812'); // 4" wide at 203dpi
  lines.push('^LL1218'); // 6" tall at 203dpi

  lines.push('^FO40,30^A0N,40,40^FDGoPeptides^FS');
  lines.push('^FO40,80^GB730,3,3^FS'); // horizontal rule
  lines.push(`^FO40,110^A0N,26,26^FDOrder ${orderNumber}   ${date}^FS`);

  lines.push('^FO40,160^A0N,28,28^FDSHIP TO:^FS');
  let y = 200;
  lines.push(`^FO40,${y}^A0N,34,34^FD${name}^FS`); y += 44;
  lines.push(`^FO40,${y}^A0N,30,30^FD${street}^FS`); y += 38;
  lines.push(`^FO40,${y}^A0N,30,30^FD${cityLine}^FS`); y += 38;
  lines.push(`^FO40,${y}^A0N,30,30^FD${country}^FS`); y += 38;
  if (phone) { lines.push(`^FO40,${y}^A0N,26,26^FDTel: ${phone}^FS`); y += 36; }

  y += 20;
  lines.push(`^FO40,${y}^GB730,3,3^FS`); y += 20;
  lines.push(`^FO40,${y}^A0N,26,26^FDITEMS:^FS`); y += 34;
  for (const line of itemLines) {
    lines.push(`^FO40,${y}^A0N,24,24^FD${line}^FS`);
    y += 32;
  }

  y += 10;
  lines.push(`^FO40,${y}^A0N,28,28^FDTotal: EUR ${order.total.toFixed(2)}^FS`); y += 44;

  // Code128 barcode of the order number for warehouse scanning
  lines.push(`^FO40,${y}^BY2^BCN,80,Y,N,N^FD${orderNumber}^FS`);

  lines.push('^XZ');
  return lines.join('\n');
}
