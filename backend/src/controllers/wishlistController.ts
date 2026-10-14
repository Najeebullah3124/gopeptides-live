import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';

const PRODUCT_INCLUDE = {
  product: {
    include: {
      images: { orderBy: { position: 'asc' as const } },
      category: true,
    },
  },
};

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const items = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    ok(res, items);
  } catch (err) {
    next(err);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { productId } = req.body as { productId: string };
    if (!productId) throw ApiError.badRequest('productId is required');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    const item = await prisma.wishlist.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      create: { userId: req.user.id, productId },
      update: {},
      include: PRODUCT_INCLUDE,
    });
    created(res, item, 'Added to wishlist');
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { productId } = req.params;
    await prisma.wishlist.deleteMany({ where: { userId: req.user.id, productId } });
    noContent(res);
  } catch (err) {
    next(err);
  }
}
