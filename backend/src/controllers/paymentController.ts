import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { ApiError, ok } from '../utils/apiResponse';
import { constructWebhookEvent, retrievePaymentIntent, toCents } from '../services/stripeService';
import { createPaymentIntent } from '../services/stripeService';
import { sendAdminNewOrderNotificationEmail, sendOrderConfirmationEmail } from '../services/emailService';
import { toEmailPayload, OrderForEmail } from './orderController';
import { isStripeConfigured } from '../config/stripe';
import { env } from '../config/env';
import { printShippingLabel } from '../services/printService';
import {
  getWallidPaymentStatus,
  parseWallidWebhookPayload,
  verifyWallidWebhookSignature,
} from '../services/wallidService';
import { isWallidConfigured } from '../config/wallid';
import { isEcomtrade24Configured, isEcomtrade24Method } from '../config/ecomtrade24';
import {
  ecomtradeSignatureFromHeaders,
  ecomtradeStatusPayloadIsPaid,
  getEcomtradeSessionStatus,
  isEcomtradeFailedStatus,
  isEcomtradePaidStatus,
  parseEcomtradeWebhookPayload,
  verifyEcomtradeWebhookSignature,
} from '../services/ecomtrade24Service';

export async function createIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isStripeConfigured()) throw ApiError.internal('Stripe is not configured');
    const { orderId } = req.body as { orderId: string };
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw ApiError.notFound('Order not found');
    if (req.user && order.userId && order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Cannot pay for this order');
    }

    if (order.paymentIntentId) {
      const existing = await retrievePaymentIntent(order.paymentIntentId);
      if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation' || existing.status === 'requires_action') {
        ok(res, { clientSecret: existing.client_secret, publishableKey: env.stripe.publishableKey });
        return;
      }
    }

    const intent = await createPaymentIntent({
      amountCents: toCents(order.total),
      currency: 'eur',
      customerEmail: order.guestEmail || undefined,
      description: `Order ${order.orderNumber}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await prisma.order.update({ where: { id: order.id }, data: { paymentIntentId: intent.id } });
    ok(res, { clientSecret: intent.client_secret, publishableKey: env.stripe.publishableKey });
  } catch (err) {
    next(err);
  }
}

// Full order shape returned to the confirmation page (works for guests too,
// since this endpoint is public and keyed by the secret payment-intent id).
const CONFIRM_ORDER_INCLUDE = {
  items: { include: { product: { include: { images: true } } } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
};

export async function confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!isStripeConfigured()) throw ApiError.internal('Stripe is not configured');
    const { paymentIntentId } = req.body as { paymentIntentId: string };
    const intent = await retrievePaymentIntent(paymentIntentId);
    const order = await prisma.order.findFirst({ where: { paymentIntentId } });
    if (!order) throw ApiError.notFound('Order not found for payment intent');

    if (intent.status === 'succeeded') {
      await handlePaymentSucceeded(paymentIntentId);
    }

    // Re-read so the confirmation page receives the freshly-updated status,
    // along with the full order (items, address, totals) for guest checkouts.
    const fullOrder = await prisma.order.findFirst({
      where: { paymentIntentId },
      include: CONFIRM_ORDER_INCLUDE,
    });

    ok(res, { status: intent.status, orderId: order.id, order: fullOrder ?? order });
  } catch (err) {
    next(err);
  }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!env.stripe.webhookSecret) {
      res.status(400).send('Webhook secret not configured');
      return;
    }
    const signature = req.headers['stripe-signature'] as string | undefined;
    if (!signature) {
      res.status(400).send('Missing Stripe signature');
      return;
    }
    const raw = req.rawBody;
    if (!raw) {
      res.status(400).send('Missing raw body');
      return;
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(raw, signature, env.stripe.webhookSecret);
    } catch (err) {
      res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
      return;
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(intent.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.order.updateMany({
          where: { paymentIntentId: intent.id },
          data: { status: 'CANCELLED', paymentStatus: 'failed' },
        });
        break;
      }
      default:
        // ignore other events
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

async function handlePaymentSucceeded(paymentIntentId: string): Promise<void> {
  const order = await prisma.order.findFirst({ 
    where: { paymentIntentId }, 
    include: { items: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } } 
  });
  if (!order || order.paymentStatus === 'paid') return;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PROCESSING', paymentStatus: 'paid' },
    });
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    if (order.userId) {
      const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  });

  const emailPayload = toEmailPayload(order as unknown as OrderForEmail);
  const userEmail = order.user?.email || order.guestEmail;
  if (userEmail) {
    const firstName = order.user?.firstName || (order.shippingAddress as any).firstName;
    await sendOrderConfirmationEmail(userEmail, firstName, emailPayload);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com';
  await sendAdminNewOrderNotificationEmail(adminEmail, emailPayload);

  // Auto-print on Payment succeeded
  const printEnabled = await prisma.systemSetting.findUnique({ where: { key: 'printnode_enabled' } });
  if (printEnabled?.value === 'true') {
    printShippingLabel(order.id).catch((err) => console.error('[Auto-Print Error]:', err));
  }
}

export async function nowpaymentsWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { payment_status, order_id } = req.body;
    
    // In a real implementation, you would verify the NOWPayments IPN signature
    // using the IPN secret key configured in NOWPayments dashboard.
    
    if (payment_status === 'finished' && order_id) {
      const order = await prisma.order.findUnique({
        where: { id: order_id },
        include: { items: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } }
      });
      if (order && order.status === 'PENDING') {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'PROCESSING', paymentStatus: 'paid' },
          });
          
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
          
          if (order.userId) {
            const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
            if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          }
        });
        
        // Send confirmation emails
        try {
          const emailPayload = toEmailPayload(order as unknown as OrderForEmail);
          const userEmail = order.user?.email || order.guestEmail;
          if (userEmail) {
            const firstName = order.user?.firstName || (order.shippingAddress as any).firstName;
            await sendOrderConfirmationEmail(userEmail, firstName, emailPayload);
          }

          const adminEmail = process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com';
          await sendAdminNewOrderNotificationEmail(adminEmail, emailPayload);
        } catch (mailErr) {
          console.error('[NOWPayments webhook] Failed to send order emails:', mailErr);
        }

        // Auto-print if enabled
        const printEnabled = await prisma.systemSetting.findUnique({ where: { key: 'printnode_enabled' } });
        if (printEnabled?.value === 'true') {
          printShippingLabel(order.id).catch((err) => console.error('[Auto-Print Error from Webhook]:', err));
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('NOWPayments webhook error:', err);
    res.status(500).send('Error');
  }
}

/**
 * Wallid Pay-by-Bank webhook (official Woo plugin contract).
 * Requires raw body + HMAC SHA256 signature (X-Wallid-Signature / X-Webhook-Signature).
 */
export async function wallidWebhook(req: Request, res: Response): Promise<void> {
  try {
    if (!isWallidConfigured()) {
      res.status(503).json({ error: 'not_configured', message: 'Wallid is not configured' });
      return;
    }

    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) {
      res.status(400).json({ error: 'bad_request', message: 'Missing raw body' });
      return;
    }

    const signature =
      (req.headers['x-wallid-signature'] as string | undefined) ||
      (req.headers['x-webhook-signature'] as string | undefined);

    if (!verifyWallidWebhookSignature(raw, signature)) {
      console.error('[Wallid webhook] Invalid signature');
      res.status(401).json({ error: 'Webhook validation failed', message: 'Invalid signature' });
      return;
    }

    let payload;
    try {
      payload = parseWallidWebhookPayload(raw);
    } catch (err) {
      res.status(400).json({ error: 'bad_request', message: (err as Error).message });
      return;
    }

    const status = String(payload.status).toLowerCase();
    const orderNumber = String(payload.order_id).trim();
    const webhookPaymentId = String(
      payload.paymentId || payload.payment_id || payload.api_payment_id || '',
    ).trim();

    let order = await prisma.order.findFirst({
      where: { orderNumber, paymentMethod: 'wallid' },
    });
    if (!order && webhookPaymentId) {
      order = await prisma.order.findFirst({
        where: { paymentIntentId: webhookPaymentId, paymentMethod: 'wallid' },
      });
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found', message: 'No order found for the given order_id' });
      return;
    }

    if (
      webhookPaymentId &&
      order.paymentIntentId &&
      !timingSafeEqualStrings(order.paymentIntentId, webhookPaymentId)
    ) {
      res.status(400).json({ error: 'bad_request', message: 'Payment ID mismatch' });
      return;
    }

    if (status === 'sent') {
      res.status(200).json({ message: 'Status unchanged', status: 'sent' });
      return;
    }

    if (status === 'paid') {
      if (payload.amount != null && payload.amount !== '') {
        const paidAmount = Number(payload.amount);
        const expectedMajor = order.total;
        const expectedMinor = Math.round(order.total * 100);
        const matchesMajor = Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedMajor) <= 0.01;
        const matchesMinor = Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedMinor) < 0.5;
        if (!matchesMajor && !matchesMinor) {
          res.status(400).json({ error: 'bad_request', message: 'Amount mismatch' });
          return;
        }
      }
      const paymentId = webhookPaymentId || order.paymentIntentId;
      if (!paymentId) {
        res.status(400).json({ error: 'bad_request', message: 'Missing payment id' });
        return;
      }
      if (!order.paymentIntentId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentIntentId: paymentId },
        });
      }
      await handlePaymentSucceeded(paymentId);
      res.status(200).json({ message: 'Webhook processed', status: 'paid', order_id: orderNumber });
      return;
    }

    if (status === 'failed') {
      if (order.paymentStatus !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', paymentStatus: 'failed' },
        });
      }
      res.status(200).json({ message: 'Webhook processed', status: 'failed', order_id: orderNumber });
      return;
    }

    res.status(200).json({ message: 'Webhook ignored', status });
  } catch (err) {
    console.error('[Wallid webhook] error:', err);
    res.status(500).json({ error: 'server_error', message: 'Error processing webhook' });
  }
}

/**
 * EcomTrade24 hosted-checkout webhook. Raw body + HMAC-SHA256 (X-Signature).
 */
export async function ecomtrade24Webhook(req: Request, res: Response): Promise<void> {
  try {
    if (!isEcomtrade24Configured()) {
      res.status(503).json({ error: 'not_configured', message: 'EcomTrade24 is not configured' });
      return;
    }

    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) {
      res.status(400).json({ error: 'bad_request', message: 'Missing raw body' });
      return;
    }

    const signature = ecomtradeSignatureFromHeaders(req.headers as Record<string, unknown>);
    if (!verifyEcomtradeWebhookSignature(raw, signature)) {
      console.error('[EcomTrade24 webhook] Invalid signature');
      res.status(401).json({ error: 'invalid_signature' });
      return;
    }

    let payload;
    try {
      payload = parseEcomtradeWebhookPayload(raw);
    } catch (err) {
      res.status(400).json({ error: 'bad_request', message: (err as Error).message });
      return;
    }

    const status = String(payload.status || '').toLowerCase();
    const orderNumber = String(payload.order_id || '').trim();
    const sessionId = payload.session_id != null ? String(payload.session_id) : '';

    let order = orderNumber
      ? await prisma.order.findFirst({
          where: { orderNumber, paymentMethod: { in: ['ecomtrade24', 'crypto'] } },
        })
      : null;
    if (!order && sessionId) {
      order = await prisma.order.findFirst({
        where: { paymentIntentId: sessionId, paymentMethod: { in: ['ecomtrade24', 'crypto'] } },
      });
    }
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (isEcomtradePaidStatus(status)) {
      if (payload.amount != null && payload.amount !== '') {
        const paidAmount = Number(payload.amount);
        if (Number.isFinite(paidAmount) && Math.abs(paidAmount - order.total) > 0.05) {
          res.status(400).json({ error: 'amount_mismatch' });
          return;
        }
      }
      const paymentId = sessionId || order.paymentIntentId;
      if (!paymentId) {
        res.status(400).json({ error: 'missing_session_id' });
        return;
      }
      if (!order.paymentIntentId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentIntentId: paymentId },
        });
      }
      await handlePaymentSucceeded(paymentId);
      res.status(200).json({ ok: true, status: 'paid', order_id: order.orderNumber });
      return;
    }

    if (isEcomtradeFailedStatus(status) && order.paymentStatus !== 'paid') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'failed' },
      });
      res.status(200).json({ ok: true, status, order_id: order.orderNumber });
      return;
    }

    res.status(200).json({ ok: true, ignored: true, status });
  } catch (err) {
    console.error('[EcomTrade24 webhook] error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}

/** Return-URL backup if webhook is delayed. */
export async function confirmEcomtradePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String((req.body as { orderId?: string }).orderId || '').trim();
    if (!orderId) throw ApiError.badRequest('orderId is required');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: CONFIRM_ORDER_INCLUDE,
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (!isEcomtrade24Method(order.paymentMethod)) {
      throw ApiError.badRequest('Order is not an EcomTrade24 payment');
    }

    if (order.paymentStatus === 'paid') {
      ok(res, { status: 'paid', orderId: order.id, order });
      return;
    }

    if (!order.paymentIntentId) {
      ok(res, { status: order.paymentStatus, orderId: order.id, order });
      return;
    }

    if (isEcomtrade24Configured()) {
      try {
        const statusPayload = await getEcomtradeSessionStatus(order.paymentIntentId);
        if (ecomtradeStatusPayloadIsPaid(statusPayload)) {
          await handlePaymentSucceeded(order.paymentIntentId);
        }
      } catch (err) {
        console.error('[EcomTrade24 confirm] status check failed:', err);
      }
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: CONFIRM_ORDER_INCLUDE,
    });
    ok(res, {
      status: fullOrder?.paymentStatus || order.paymentStatus,
      orderId: order.id,
      order: fullOrder ?? order,
    });
  } catch (err) {
    next(err);
  }
}

/** Return-URL backup: sync Wallid payment status if webhook is delayed. */
export async function confirmWallidPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String((req.body as { orderId?: string }).orderId || '').trim();
    if (!orderId) throw ApiError.badRequest('orderId is required');

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: CONFIRM_ORDER_INCLUDE,
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.paymentMethod !== 'wallid') throw ApiError.badRequest('Order is not a Wallid payment');

    if (order.paymentStatus === 'paid') {
      ok(res, { status: 'paid', orderId: order.id, order });
      return;
    }

    if (!order.paymentIntentId) {
      ok(res, { status: order.paymentStatus, orderId: order.id, order });
      return;
    }

    if (isWallidConfigured()) {
      try {
        const statusPayload = await getWallidPaymentStatus(order.paymentIntentId);
        if (wallidStatusIsPaid(statusPayload)) {
          await handlePaymentSucceeded(order.paymentIntentId);
        }
      } catch (err) {
        console.error('[Wallid confirm] status check failed:', err);
      }
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: CONFIRM_ORDER_INCLUDE,
    });
    ok(res, {
      status: fullOrder?.paymentStatus || order.paymentStatus,
      orderId: order.id,
      order: fullOrder ?? order,
    });
  } catch (err) {
    next(err);
  }
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function wallidStatusIsPaid(payload: unknown): boolean {
  if (!payload) return false;
  if (typeof payload === 'string') {
    const s = payload.toLowerCase();
    return s === 'paid' || s === 'success' || s === 'completed' || s === 'settled';
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    const nested = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : null;
    const candidates = [obj.status, obj.paymentStatus, obj.state, nested?.status];
    return candidates.some((v) => {
      if (typeof v !== 'string') return false;
      const s = v.toLowerCase();
      return s === 'paid' || s === 'success' || s === 'completed' || s === 'settled';
    });
  }
  return false;
}
