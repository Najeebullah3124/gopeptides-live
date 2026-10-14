import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user && env.smtp.pass ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

const BRAND = {
  name: 'GoPeptides',
  primary: '#5CC0BE',
  bg: '#071019',
  surface: '#0D1A2B',
  text: '#E8EDF5',
  muted: '#8899AA',
};

function shell(title: string, inner: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Helvetica Neue',Arial,sans-serif;color:${BRAND.text}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border-radius:12px;overflow:hidden;border:1px solid rgba(92,192,190,0.12)">
        <tr><td style="padding:32px 36px;border-bottom:1px solid rgba(92,192,190,0.1)">
          <div style="font-size:22px;font-weight:800;letter-spacing:0.5px;color:${BRAND.primary}">${BRAND.name}</div>
          <div style="font-size:12px;color:${BRAND.muted};margin-top:4px;text-transform:uppercase;letter-spacing:1.5px">Research Peptides</div>
        </td></tr>
        <tr><td style="padding:32px 36px;color:${BRAND.text};font-size:15px;line-height:1.65">${inner}</td></tr>
        <tr><td style="padding:24px 36px;border-top:1px solid rgba(92,192,190,0.1);color:${BRAND.muted};font-size:12px;text-align:center">
          For research use only &mdash; not for human consumption.<br/>
          &copy; ${new Date().getFullYear()} ${BRAND.name}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.primary};color:${BRAND.bg};font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">${label}</a>`;
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (!env.smtp.user) {
      console.log(`[email] (no SMTP) to=${to} subject="${subject}"`);
      return;
    }
    await getTransporter().sendMail({ from: env.smtp.from, to, subject, html });
  } catch (err) {
    console.error('[email] send failed:', (err as Error).message);
  }
}

export async function sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
  const html = shell(
    'Verify your email',
    `<h2 style="margin:0 0 16px;font-size:22px;color:${BRAND.text}">Welcome, ${firstName}.</h2>
     <p style="margin:0 0 20px;color:${BRAND.muted}">Use the following 6-digit code to verify your email address and activate your GoPeptides account.</p>
     <p style="margin:0 0 28px;text-align:center">
       <span style="display:inline-block;background:${BRAND.bg};color:${BRAND.primary};font-family:monospace;font-size:28px;font-weight:bold;padding:16px 24px;border-radius:8px;letter-spacing:6px;border:2px dashed ${BRAND.primary}">${code}</span>
     </p>
     <p style="margin:0;font-size:13px;color:${BRAND.muted}">This code is required to complete your registration.</p>`,
  );
  await sendMail(to, 'Verify your GoPeptides email', html);
}

export async function sendPasswordResetEmail(to: string, firstName: string, code: string): Promise<void> {
  const html = shell(
    'Reset your password',
    `<h2 style="margin:0 0 16px;font-size:22px">Reset request received</h2>
     <p style="margin:0 0 20px;color:${BRAND.muted}">Hi ${firstName}, use the following 6-digit code to reset your password. This code expires in 1 hour.</p>
     <p style="margin:0 0 28px;text-align:center">
       <span style="display:inline-block;background:${BRAND.bg};color:${BRAND.primary};font-family:monospace;font-size:28px;font-weight:bold;padding:16px 24px;border-radius:8px;letter-spacing:6px;border:2px dashed ${BRAND.primary}">${code}</span>
     </p>
     <p style="margin:0;font-size:13px;color:${BRAND.muted}">If you didn't request this, you can safely ignore this email.</p>`,
  );
  await sendMail(to, 'Reset your GoPeptides password', html);
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const html = shell(
    'Welcome to GoPeptides',
    `<h2 style="margin:0 0 16px;font-size:22px">Welcome, ${firstName}.</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">Your research-grade peptide account is ready. As a welcome, enjoy <strong style="color:${BRAND.primary}">15% off</strong> your first order with code:</p>
     <p style="margin:0 0 24px"><span style="display:inline-block;background:${BRAND.bg};color:${BRAND.primary};font-family:monospace;font-size:18px;padding:12px 20px;border-radius:8px;letter-spacing:2px;border:1px dashed ${BRAND.primary}">WELCOME15</span></p>
     <p style="margin:0 0 24px">${button(env.clientUrl + '/shop', 'Browse products')}</p>`,
  );
  await sendMail(to, 'Welcome to GoPeptides', html);
}

export async function sendSubscriptionEmail(to: string, name: string | null): Promise<void> {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const html = shell(
    'Thanks for subscribing!',
    `<h2 style="margin:0 0 16px;font-size:22px">${greeting}</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">Thank you for subscribing to our newsletter! You'll be the first to hear about our new products, research updates, and exclusive offers.</p>
     <p style="margin:0 0 16px;color:${BRAND.muted}">As a thank you, enjoy <strong style="color:${BRAND.primary}">10% off</strong> your next order with the code below:</p>
     <p style="margin:0 0 24px"><span style="display:inline-block;background:${BRAND.bg};color:${BRAND.primary};font-family:monospace;font-size:18px;font-weight:bold;padding:12px 20px;border-radius:8px;letter-spacing:2px;border:1px dashed ${BRAND.primary};text-transform:uppercase">welcome10</span></p>
     <p style="margin:0 0 24px">${button(env.clientUrl + '/shop', 'Shop now')}</p>`,
  );
  await sendMail(to, 'Welcome to GoPeptides! Here is your 10% discount', html);
}

export interface OrderItemEmail {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderEmailPayload {
  orderNumber: string;
  items: OrderItemEmail[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

function money(n: number): string {
  return '€' + n.toFixed(2);
}

function itemsTable(items: OrderItemEmail[]): string {
  return `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
    <thead><tr style="border-bottom:1px solid rgba(92,192,190,0.15)">
      <th align="left" style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px">Item</th>
      <th align="right" style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px">Qty</th>
      <th align="right" style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px">Price</th>
    </tr></thead>
    <tbody>
      ${items
        .map(
          (i) =>
            `<tr style="border-bottom:1px solid rgba(92,192,190,0.08)"><td>${i.name}</td><td align="right">${i.quantity}</td><td align="right">${money(i.price * i.quantity)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function totalsBlock(o: OrderEmailPayload): string {
  return `<table width="100%" cellpadding="4" cellspacing="0" style="margin-top:12px">
    <tr><td style="color:${BRAND.muted}">Subtotal</td><td align="right">${money(o.subtotal)}</td></tr>
    ${o.discount > 0 ? `<tr><td style="color:${BRAND.muted}">Discount</td><td align="right" style="color:${BRAND.primary}">-${money(o.discount)}</td></tr>` : ''}
    <tr><td style="color:${BRAND.muted}">Shipping</td><td align="right">${money(o.shipping)}</td></tr>
    <tr><td style="color:${BRAND.muted}">Tax (21%)</td><td align="right">${money(o.tax)}</td></tr>
    <tr><td style="font-weight:700;padding-top:10px;border-top:1px solid rgba(92,192,190,0.15)">Total</td><td align="right" style="font-weight:700;color:${BRAND.primary};padding-top:10px;border-top:1px solid rgba(92,192,190,0.15)">${money(o.total)}</td></tr>
  </table>`;
}

export async function sendOrderConfirmationEmail(to: string, firstName: string, order: OrderEmailPayload): Promise<void> {
  const a = order.shippingAddress;
  const html = shell(
    `Order ${order.orderNumber} confirmed`,
    `<h2 style="margin:0 0 8px;font-size:22px">Order confirmed</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">Thank you, ${firstName}. Your order <strong style="color:${BRAND.primary}">${order.orderNumber}</strong> has been received.</p>
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <h3 style="margin:24px 0 8px;font-size:15px">Shipping address</h3>
     <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6">${a.firstName} ${a.lastName}<br/>${a.street}<br/>${a.postalCode} ${a.city}<br/>${a.country}</p>
     <p style="margin:24px 0 0">${button(env.clientUrl + '/account/orders', 'View order')}</p>`,
  );
  await sendMail(to, `Order ${order.orderNumber} confirmed — GoPeptides`, html);
}

export async function sendOrderStatusEmail(to: string, firstName: string, order: OrderEmailPayload, status: string): Promise<void> {
  const html = shell(
    `Order ${order.orderNumber} update`,
    `<h2 style="margin:0 0 8px;font-size:22px">Order ${status.toLowerCase()}</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">Hi ${firstName}, your order <strong style="color:${BRAND.primary}">${order.orderNumber}</strong> is now <strong>${status}</strong>.</p>
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <p style="margin:24px 0 24px">${button(env.clientUrl + '/account/orders', 'View order')}</p>`,
  );
  await sendMail(to, `Order ${order.orderNumber} is ${status.toLowerCase()}`, html);
}

export async function sendShipmentEmail(to: string, firstName: string, order: OrderEmailPayload, trackingNumber?: string, courier?: string): Promise<void> {
  const trackingInfo = trackingNumber ? `<p style="margin:0 0 16px;color:${BRAND.muted}">Your tracking number is <strong>${trackingNumber}</strong>${courier ? ` via ${courier}` : ''}.</p>` : '';
  const html = shell(
    `Order ${order.orderNumber} has shipped`,
    `<h2 style="margin:0 0 8px;font-size:22px">Your order is on the way!</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">Hi ${firstName}, your order <strong style="color:${BRAND.primary}">${order.orderNumber}</strong> has been shipped.</p>
     ${trackingInfo}
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <p style="margin:24px 0 24px">${button(env.clientUrl + '/account/orders', 'View order')}</p>`,
  );
  await sendMail(to, `Your order ${order.orderNumber} has shipped — GoPeptides`, html);
}

export async function sendAdminNewOrderNotificationEmail(adminEmail: string, order: OrderEmailPayload): Promise<void> {
  // Client request 2026-07-29: admin panel Orders is enough — no [New Order] emails.
  // Re-enable: set ADMIN_NEW_ORDER_EMAIL=true in env.
  if (process.env.ADMIN_NEW_ORDER_EMAIL !== 'true') {
    return;
  }
  const a = order.shippingAddress;
  const html = shell(
    `New Order Received: ${order.orderNumber}`,
    `<h2 style="margin:0 0 8px;font-size:22px">New Order Received</h2>
     <p style="margin:0 0 16px;color:${BRAND.muted}">A new order <strong style="color:${BRAND.primary}">${order.orderNumber}</strong> has just been placed and paid.</p>
     ${itemsTable(order.items)}
     ${totalsBlock(order)}
     <h3 style="margin:24px 0 8px;font-size:15px">Customer details</h3>
     <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6">${a.firstName} ${a.lastName}<br/>${a.street}<br/>${a.postalCode} ${a.city}<br/>${a.country}</p>
     <p style="margin:24px 0 0">${button(env.clientUrl + '/admin/orders', 'Manage Order')}</p>`,
  );
  await sendMail(adminEmail, `[New Order] ${order.orderNumber} — GoPeptides`, html);
}
