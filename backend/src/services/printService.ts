import axios from 'axios';
import { prisma } from '../config/database';

async function getSetting(key: string): Promise<string> {
  const s = await prisma.systemSetting.findUnique({ where: { key } });
  return s?.value ?? '';
}

/**
 * Send a text shipping label to PrintNode cloud printing service.
 * PrintNode API docs: https://www.printnode.com/en/docs/api/curl
 */
export async function printShippingLabel(orderId: string): Promise<{ success: boolean; message: string }> {
  const [apiKey, printerId, enabled] = await Promise.all([
    getSetting('printnode_api_key'),
    getSetting('printnode_printer_id'),
    getSetting('printnode_enabled'),
  ]);

  if (enabled !== 'true') return { success: false, message: 'PrintNode is not enabled in settings' };
  if (!apiKey) return { success: false, message: 'PrintNode API key not configured' };
  if (!printerId) return { success: false, message: 'PrintNode Printer ID not configured' };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, user: true },
  });
  if (!order) return { success: false, message: 'Order not found' };

  const addr = typeof order.shippingAddress === 'string'
    ? JSON.parse(order.shippingAddress)
    : order.shippingAddress;

  const labelText = [
    '========================================',
    `  GOPEPTIDES — SHIPPING LABEL`,
    '========================================',
    `  Order:    ${order.orderNumber}`,
    `  Date:     ${new Date(order.createdAt).toLocaleDateString('nl-NL')}`,
    '',
    '  SHIP TO:',
    `  ${addr.firstName} ${addr.lastName}`,
    `  ${addr.street}`,
    `  ${addr.postalCode} ${addr.city}`,
    `  ${addr.country}`,
    addr.phone ? `  Tel: ${addr.phone}` : '',
    '',
    '  ITEMS:',
    ...order.items.map((i) => `  - ${i.name} x${i.quantity}`),
    '',
    `  Total: €${order.total.toFixed(2)}`,
    '========================================',
  ].filter(Boolean).join('\n');

  // Base64-encode the label content (PrintNode requires base64 for raw content)
  const contentB64 = Buffer.from(labelText).toString('base64');

  const payload = {
    printerId: parseInt(printerId, 10),
    title: `GoPeptides Order ${order.orderNumber}`,
    contentType: 'raw_base64',
    content: contentB64,
    source: 'GoPeptides Admin',
  };

  await axios.post('https://api.printnode.com/printjobs', payload, {
    auth: { username: apiKey, password: '' },
    timeout: 10000,
  });

  return { success: true, message: `Label sent to printer ${printerId}` };
}

export async function printPdfDocument(
  pdfBuffer: Buffer,
  title: string,
  source = 'GoPeptides Admin',
  explicitPrinterId?: string
): Promise<{ success: boolean; message: string }> {
  const [apiKey, printerIdFromSettings, enabled] = await Promise.all([
    getSetting('printnode_api_key'),
    getSetting('printnode_printer_id'),
    getSetting('printnode_enabled'),
  ]);

  if (enabled !== 'true') return { success: false, message: 'PrintNode is not enabled in settings' };
  if (!apiKey) return { success: false, message: 'PrintNode API key not configured' };

  const resolvedPrinterId = explicitPrinterId || printerIdFromSettings;
  if (!resolvedPrinterId) return { success: false, message: 'PrintNode Printer ID not configured' };

  const contentB64 = pdfBuffer.toString('base64');
  const payload = {
    printerId: parseInt(resolvedPrinterId, 10),
    title,
    contentType: 'pdf_base64',
    content: contentB64,
    source,
  };

  await axios.post('https://api.printnode.com/printjobs', payload, {
    auth: { username: apiKey, password: '' },
    timeout: 10000,
  });

  return { success: true, message: `Print job sent to printer ${resolvedPrinterId}` };
}
