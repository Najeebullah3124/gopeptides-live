import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';

interface CreateCouponBody {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  minOrder?: number;
  maxUses?: number;
  expiresAt?: string;
  isActive?: boolean;
  oncePerUser?: boolean;
}

export async function validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, subtotal, email } = req.body as { code: string; subtotal: number; email?: string };
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest('Coupon expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw ApiError.badRequest('Coupon usage limit reached');
    if (coupon.minOrder && subtotal < coupon.minOrder) {
      throw ApiError.badRequest(`Minimum order €${coupon.minOrder.toFixed(2)} required`);
    }

    if (coupon.oncePerUser) {
      const conditions: any[] = [];
      if (req.user?.id) {
        conditions.push({ userId: req.user.id });
      }
      const targetEmail = email || req.user?.email;
      if (targetEmail) {
        conditions.push({ guestEmail: targetEmail });
        conditions.push({ user: { email: targetEmail } });
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

    const discountAmount =
      coupon.type === 'percent'
        ? Number(((subtotal * coupon.discount) / 100).toFixed(2))
        : Number(Math.min(coupon.discount, subtotal).toFixed(2));

    ok(res, {
      code: coupon.code,
      type: coupon.type,
      discount: coupon.discount,
      discountAmount,
      minOrder: coupon.minOrder,
      oncePerUser: coupon.oncePerUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminList(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    ok(res, coupons);
  } catch (err) {
    next(err);
  }
}

export async function adminCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as CreateCouponBody;
    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        discount: body.discount,
        type: body.type,
        minOrder: body.minOrder,
        maxUses: body.maxUses,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive ?? true,
        oncePerUser: body.oncePerUser ?? false,
      },
    });
    created(res, coupon, 'Coupon created');
  } catch (err) {
    next(err);
  }
}

export async function adminUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as Partial<CreateCouponBody>;
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.code ? { code: body.code.toUpperCase() } : {}),
        ...(body.discount !== undefined ? { discount: body.discount } : {}),
        ...(body.type ? { type: body.type } : {}),
        ...(body.minOrder !== undefined ? { minOrder: body.minOrder } : {}),
        ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.oncePerUser !== undefined ? { oncePerUser: body.oncePerUser } : {}),
      },
    });
    ok(res, coupon, 'Coupon updated');
  } catch (err) {
    next(err);
  }
}

export async function adminDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    noContent(res);
  } catch (err) {
    next(err);
  }
}
