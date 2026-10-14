import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

// SQLite has no enums — keep statuses as a string union.
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
import { prisma } from '../config/database';
import { ApiError, created, ok } from '../utils/apiResponse';
import { logAudit } from '../utils/audit';
import { buildMeta, parsePagination } from '../utils/pagination';
import { generateOrderNumber } from '../utils/orderNumber';
import {
  OrderEmailPayload,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendShipmentEmail,
  sendAdminNewOrderNotificationEmail,
} from '../services/emailService';
import { getBankTransferDetails, isBankTransferMethod, type BankTransferDetails } from '../config/bankTransfer';
import { isWallidConfigured, isWallidMethod, resolveWallidClientBase } from '../config/wallid';
import { createWallidPayment } from '../services/wallidService';
import {
  isEcomtrade24Configured,
  isEcomtrade24Method,
  resolveEcomtradeClientBase,
} from '../config/ecomtrade24';
import { createEcomtradeSession, iso2Country } from '../services/ecomtrade24Service';
import { notifyNewOrder } from '../services/notificationService';
import { env } from '../config/env';
import { quoteExpressEu, countryToIso2, isNetherlandsCountry } from '../config/expressEu';
import { buildShippingLabelZpl } from '../services/zplLabelService';

const ORDER_INCLUDE = {
  items: { include: { product: { include: { images: true } } } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.OrderInclude;

// Matches the published Shipping Policy (shipping.sec3.body): free shipping above €50 in
// NL/BE, above €150 for the rest of the EU. Was previously a flat €100 for everyone — bug.
const SHIPPING_FREE_THRESHOLD_NL_BE = 50;
const SHIPPING_FREE_THRESHOLD_OTHER_EU = 150;
// Fee below the threshold: NL/BE €4.95, rest of Europe €7.95 (client, 30 Sep 2026). The cart and
// checkout display mirrors this in window.gpShipping (frontend index bundle) — keep both in sync.
const SHIPPING_FEE_NL_BE = 4.95;
const SHIPPING_FEE_OTHER_EU = 7.95;

function isNlOrBe(country?: string): boolean {
  return isNetherlandsCountry(country) || countryToIso2(country) === 'BE';
}

function freeShippingThresholdFor(country?: string): number {
  return isNlOrBe(country) ? SHIPPING_FREE_THRESHOLD_NL_BE : SHIPPING_FREE_THRESHOLD_OTHER_EU;
}

function shippingFeeFor(country?: string): number {
  return isNlOrBe(country) ? SHIPPING_FEE_NL_BE : SHIPPING_FEE_OTHER_EU;
}
/** Catalog prices include 21% VAT — do not add on top (client request). */
const TAX_RATE = 0;

interface CartItemInput {
  productId: string;
  quantity: number;
}

interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  expressDelivery?: boolean;
}

interface CreateOrderBody {
  items: CartItemInput[];
  shippingAddress: ShippingAddressInput;
  billingAddress?: ShippingAddressInput;
  couponCode?: string;
  notes?: string;
  paymentMethod?: string;
  guestEmail?: string;
  expressDelivery?: boolean;
}

async function computeTotals(
  items: CartItemInput[],
  couponCode?: string,
  userId?: string,
  email?: string,
  country?: string,
  expressDelivery?: boolean,
) {
  if (!items.length) throw ApiError.badRequest('Order must contain at least one item');

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const map = new Map(products.map((p) => [p.id, p]));

  const itemized = items.map((i) => {
    const p = map.get(i.productId);
    if (!p || !p.isActive) throw ApiError.badRequest(`Product not available: ${i.productId}`);
    if (p.stock < i.quantity) throw ApiError.badRequest(`Insufficient stock for ${p.name} (have ${p.stock})`);
    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: i.quantity,
      lineTotal: Number((p.price * i.quantity).toFixed(2)),
    };
  });

  const subtotal = Number(itemized.reduce((n, i) => n + i.lineTotal, 0).toFixed(2));

  let discount = 0;
  let appliedCoupon: { code: string; discount: number; type: string } | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest('Coupon expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw ApiError.badRequest('Coupon usage limit reached');
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      throw ApiError.badRequest(`Minimum order €${coupon.minOrder.toFixed(2)} required for this coupon`);
    }

    if (coupon.oncePerUser) {
      const conditions: any[] = [];
      if (userId) {
        conditions.push({ userId });
      }
      if (email) {
        conditions.push({ guestEmail: email });
        conditions.push({ user: { email } });
      }
      if (conditions.length > 0) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            couponCode: coupon.code,
            status: { not: 'CANCELLED' },
            OR: conditions,
          },
        });
        if (existingOrder) {
          throw ApiError.badRequest('Coupon has already been used by this user');
        }
      }
    }

    discount = coupon.type === 'percent' ? Number(((subtotal * coupon.discount) / 100).toFixed(2)) : Number(coupon.discount.toFixed(2));
    discount = Math.min(discount, subtotal);
    appliedCoupon = { code: coupon.code, discount: coupon.discount, type: coupon.type };
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  const baseShipping = afterDiscount >= freeShippingThresholdFor(country) ? 0 : shippingFeeFor(country);
  const express = quoteExpressEu(country, afterDiscount, !!expressDelivery);
  const shipping = Number((baseShipping + express.surcharge).toFixed(2));
  const tax = Number((afterDiscount * TAX_RATE).toFixed(2));
  const total = Number((afterDiscount + shipping + tax).toFixed(2));

  return { itemized, subtotal, discount, shipping, tax, total, appliedCoupon, express };
}

async function createOrderRecord(body: CreateOrderBody, userId?: string, userEmail?: string) {
  const totals = await computeTotals(
    body.items,
    body.couponCode,
    userId,
    userEmail || body.guestEmail,
    body.shippingAddress?.country,
    body.expressDelivery,
  );

  // SQLite + Prisma $extends loses `include` type inference inside transactions,
  // so we run the create on the main client. Coupon increment happens immediately after.
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: userId,
      guestEmail: userId ? null : body.guestEmail,
      status: 'PENDING',
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      total: totals.total,
      // SQLite stores as TEXT; the Prisma extension parses on read.
      shippingAddress: JSON.stringify({
        ...body.shippingAddress,
        expressDelivery: totals.express.applied,
      }),
      billingAddress: body.billingAddress ? JSON.stringify(body.billingAddress) : null,
      paymentMethod: body.paymentMethod || 'bank_transfer',
      couponCode: totals.appliedCoupon?.code,
      notes: [body.notes, totals.express.applied ? 'Express EU delivery' : '']
        .filter((s) => s && String(s).trim())
        .join('\n') || null,
      items: {
        create: totals.itemized.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      },
    },
    include: ORDER_INCLUDE,
  });

  if (totals.appliedCoupon) {
    await prisma.coupon.update({
      where: { code: totals.appliedCoupon.code },
      data: { usedCount: { increment: 1 } },
    });
  }

  return order;
}

type RedirectPaymentResult = {
  bankTransferDetails: BankTransferDetails | null;
  wallidRedirectUrl: string | null;
  ecomtradeRedirectUrl: string | null;
};

async function startRedirectPayment(
  req: Request,
  order: { id: string; orderNumber: string; total: number; items: Array<{ name: string; quantity: number; price: number }> },
  body: CreateOrderBody,
  customerEmail: string,
): Promise<RedirectPaymentResult> {
  const result: RedirectPaymentResult = {
    bankTransferDetails: null,
    wallidRedirectUrl: null,
    ecomtradeRedirectUrl: null,
  };

  if (isBankTransferMethod(body.paymentMethod)) {
    result.bankTransferDetails = getBankTransferDetails(order.orderNumber);
    return result;
  }

  if (isWallidMethod(body.paymentMethod)) {
    if (!isWallidConfigured()) throw ApiError.badRequest('Wallid is not configured');
    try {
      const clientBase = resolveWallidClientBase(req.get('origin'), env.clientUrl);
      const created = await createWallidPayment({
        total: order.total,
        orderNumber: order.orderNumber,
        currency: 'EUR',
        checkoutUrl: `${clientBase}/checkout?wallid=fail&orderId=${order.id}`,
        successUrl: `${clientBase}/order-confirmation?orderId=${order.id}&wallid=1`,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          lineTotal: item.price * item.quantity,
          productUrl: `${clientBase}/shop`,
        })),
      });
      result.wallidRedirectUrl = created.redirectUrl;
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentIntentId: created.paymentId },
      });
    } catch (err) {
      console.error('[Wallid] create payment failed:', err);
      throw ApiError.badRequest((err as Error).message || 'Wallid payment session failed');
    }
    return result;
  }

  if (isEcomtrade24Method(body.paymentMethod)) {
    if (!isEcomtrade24Configured()) throw ApiError.badRequest('Online payments (EcomTrade24) are not configured');
    try {
      const clientBase = resolveEcomtradeClientBase(req.get('origin'), env.clientUrl);
      const created = await createEcomtradeSession({
        amount: order.total,
        currency: 'EUR',
        orderNumber: order.orderNumber,
        email: customerEmail,
        country: iso2Country(body.shippingAddress?.country),
        returnUrl: `${clientBase}/order-confirmation?orderId=${order.id}&ecomtrade=1`,
        cancelUrl: `${clientBase}/checkout?ecomtrade=fail&orderId=${order.id}`,
      });
      result.ecomtradeRedirectUrl = created.checkoutUrl;
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentIntentId: created.sessionId, paymentMethod: 'ecomtrade24' },
      });
    } catch (err) {
      console.error('[EcomTrade24] create session failed:', err);
      throw ApiError.badRequest((err as Error).message || 'EcomTrade24 payment session failed');
    }
  }

  return result;
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as CreateOrderBody;
    const order = await createOrderRecord(body, req.user.id, req.user.email);

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ORDER',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total, isGuest: false },
      ipAddress: req.ip,
    });

    const cryptoDetails: { invoiceUrl: string; paymentAddress?: string; payAmount?: number } | null = null;
    const { bankTransferDetails, wallidRedirectUrl, ecomtradeRedirectUrl } = await startRedirectPayment(
      req,
      order,
      body,
      req.user.email,
    );

    // Non-blocking notification
    notifyNewOrder(order.id).catch(() => {});
    
    // Notify admin & customer
    try {
      const emailPayload = toEmailPayload(order as unknown as OrderForEmail);
      const adminEmail = process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com';
      await sendAdminNewOrderNotificationEmail(adminEmail, emailPayload);

      const customerEmail = req.user.email;
      const customerFirstName = order.user?.firstName || (body.shippingAddress as ShippingAddressInput).firstName;
      await sendOrderConfirmationEmail(customerEmail, customerFirstName, emailPayload);
    } catch (err) {
      console.error('Failed to send order notification:', err);
    }

    created(
      res,
      {
        order,
        clientSecret: null,
        cryptoDetails,
        bankTransferDetails,
        wallidRedirectUrl,
        ecomtradeRedirectUrl,
        publishableKey: null,
      },
      'Order created'
    );
  } catch (err) {
    next(err);
  }
}

export async function createGuestOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as CreateOrderBody;
    if (!body.guestEmail) throw ApiError.badRequest('Guest email is required');
    const order = await createOrderRecord(body);

    await logAudit({
      userId: null,
      action: 'CREATE_ORDER_GUEST',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, total: order.total, isGuest: true, guestEmail: body.guestEmail },
      ipAddress: req.ip,
    });

    const cryptoDetails: { invoiceUrl: string; paymentAddress?: string; payAmount?: number } | null = null;
    const { bankTransferDetails, wallidRedirectUrl, ecomtradeRedirectUrl } = await startRedirectPayment(
      req,
      order,
      body,
      body.guestEmail,
    );

    notifyNewOrder(order.id).catch(() => {});
    
    // Notify admin & customer
    try {
      const emailPayload = toEmailPayload(order as unknown as OrderForEmail);
      const adminEmail = process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com';
      await sendAdminNewOrderNotificationEmail(adminEmail, emailPayload);

      const customerEmail = body.guestEmail;
      const customerFirstName = (body.shippingAddress as ShippingAddressInput).firstName;
      await sendOrderConfirmationEmail(customerEmail, customerFirstName, emailPayload);
    } catch (err) {
      console.error('Failed to send order notification:', err);
    }

    created(
      res,
      {
        order,
        clientSecret: null,
        cryptoDetails,
        bankTransferDetails,
        wallidRedirectUrl,
        ecomtradeRedirectUrl,
        publishableKey: null,
      },
      'Order created'
    );
  } catch (err) {
    next(err);
  }
}

// Structural type that matches both the raw Prisma payload and the $extends-transformed shape.
export interface OrderForEmail {
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: unknown;
}
export function toEmailPayload(order: OrderForEmail): OrderEmailPayload {
  const addr = order.shippingAddress as unknown as ShippingAddressInput;
  return {
    orderNumber: order.orderNumber,
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    shippingAddress: addr,
  };
}

export async function myOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const pagination = parsePagination(req);
    const status = req.query.status as OrderStatus | undefined;
    const where: Prisma.OrderWhereInput = { userId: req.user.id };
    if (status) where.status = status;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: orders, meta: buildMeta(pagination, totalCount) });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw ApiError.notFound('Order not found');
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
      throw ApiError.forbidden('You cannot access this order');
    }
    ok(res, order);
  } catch (err) {
    next(err);
  }
}

export async function listAllOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePagination(req);
    const status = req.query.status as OrderStatus | undefined;
    const search = req.query.search as string | undefined;
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { guestEmail: { contains: search } },
        { user: { email: { contains: search } } },
      ];
    }
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: orders, meta: buildMeta(pagination, totalCount) });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    console.log('[updateOrderStatus] ID:', id, 'BODY:', req.body);
    const { status, trackingNumber, courier, paymentStatus } = req.body as {
      status: OrderStatus;
      trackingNumber?: string;
      courier?: string;
      paymentStatus?: 'pending' | 'paid' | 'failed';
    };
    
    const data: Prisma.OrderUpdateInput = { status };
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    if (courier !== undefined) data.courier = courier;
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: ORDER_INCLUDE,
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE_STATUS',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, status, paymentStatus },
      ipAddress: req.ip,
    });

    const email = order.user?.email || order.guestEmail;
    const firstName = order.user?.firstName || (order.shippingAddress as unknown as ShippingAddressInput).firstName;
    if (email) {
      try {
        const emailPayload = toEmailPayload(order as unknown as OrderForEmail);
        if (status === 'SHIPPED') {
          await sendShipmentEmail(email, firstName, emailPayload, order.trackingNumber || undefined, order.courier || undefined);
        } else if (status === 'PROCESSING') {
          await sendOrderStatusEmail(email, firstName, emailPayload, 'Processing');
        } else {
          await sendOrderStatusEmail(email, firstName, emailPayload, status);
        }
      } catch (mailErr) {
        console.error('[orderController] Failed to send order status update email:', mailErr);
      }
    }
    ok(res, order, 'Order status updated');
  } catch (err) {
    next(err);
  }
}

// Enqueues a ZPL job for the local print agent (see printAgentRoutes.ts) to pick up and
// send to the office Zebra printer. The printer has no internet-reachable IP, so this
// server can't print to it directly; the agent bridges that gap by polling.
export async function printOrderLabel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw ApiError.notFound('Order not found');
    const zpl = buildShippingLabelZpl(order as any);
    const job = await prisma.printJob.create({
      data: { orderId: order.id, zpl },
    });
    ok(res, { jobId: job.id }, 'Label queued for the print agent');
  } catch (err) {
    next(err);
  }
}
