import axios from 'axios';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';

async function getSetting(key: string): Promise<string> {
  const s = await prisma.systemSetting.findUnique({ where: { key } });
  return s?.value ?? '';
}

/**
 * Send a Telegram message to the configured chat via Bot API.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const [botToken, chatId, enabled] = await Promise.all([
    getSetting('telegram_bot_token'),
    getSetting('telegram_chat_id'),
    getSetting('telegram_enabled'),
  ]);
  if (enabled !== 'true' || !botToken || !chatId) return;
  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
  }, { timeout: 8000 }).catch((e) => console.error('[Telegram] failed:', e.message));
}

/**
 * Send an email notification to the configured admin recipients.
 */
export async function sendEmailNotification(subject: string, html: string): Promise<void> {
  const [enabled, recipients] = await Promise.all([
    getSetting('email_alerts_enabled'),
    getSetting('email_alerts_recipients'),
  ]);
  if (enabled !== 'true' || !recipients) return;

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  if (!smtpUser || !smtpPass) return;

  const transporter = nodemailer.createTransport({
    host: smtpHost, port: smtpPort, secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const toList = recipients.split(',').map((e) => e.trim()).filter(Boolean);
  await transporter.sendMail({
    from: `GoPeptides <${smtpUser}>`,
    to: toList.join(', '),
    subject,
    html,
  }).catch((e) => console.error('[Email] failed:', e.message));
}

/**
 * Notify admin of a new order via Telegram and Email.
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: true },
    });
    if (!order) return;

    const addr = typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress;

    const customerName = order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : addr ? `${addr.firstName} ${addr.lastName} (guest)` : 'Guest';

    const itemLines = order.items.map((i) => `• ${i.name} x${i.quantity}`).join('\n');

    const telegramMsg = [
      `🛒 <b>New Order: ${order.orderNumber}</b>`,
      `👤 ${customerName}`,
      `💶 €${order.total.toFixed(2)} · ${order.paymentMethod || 'stripe'}`,
      `📦 ${itemLines}`,
    ].join('\n');

    const emailHtml = `
      <h2>New Order: ${order.orderNumber}</h2>
      <p><b>Customer:</b> ${customerName}</p>
      <p><b>Total:</b> €${order.total.toFixed(2)}</p>
      <p><b>Payment:</b> ${order.paymentMethod || 'stripe'}</p>
      <ul>${order.items.map((i) => `<li>${i.name} x${i.quantity}</li>`).join('')}</ul>
    `;

    await Promise.all([
      sendTelegramNotification(telegramMsg),
      // Admin email alerts off by default (same as sendAdminNewOrderNotificationEmail).
      process.env.ADMIN_NEW_ORDER_EMAIL === 'true'
        ? sendEmailNotification(`New Order ${order.orderNumber} — €${order.total.toFixed(2)}`, emailHtml)
        : Promise.resolve(),
    ]);
  } catch (e) {
    console.error('[notifyNewOrder] failed:', e);
  }
}

/** Notify admin channels of a new newsletter subscriber (email + optional Telegram). */
export async function notifyNewSubscriber(email: string, name?: string | null): Promise<void> {
  try {
    const who = name?.trim() ? `${name.trim()} <${email}>` : email;
    const telegramMsg = [
      `📬 <b>New newsletter subscriber</b>`,
      `✉️ ${who}`,
    ].join('\n');

    const emailHtml = `
      <h2>New newsletter subscriber</h2>
      <p><b>Email:</b> ${email}</p>
      ${name?.trim() ? `<p><b>Name:</b> ${name.trim()}</p>` : ''}
    `;

    await Promise.all([
      sendTelegramNotification(telegramMsg),
      sendEmailNotification('[GoPeptides] New newsletter subscriber', emailHtml),
    ]);
  } catch (e) {
    console.error('[notifyNewSubscriber] failed:', e);
  }
}
