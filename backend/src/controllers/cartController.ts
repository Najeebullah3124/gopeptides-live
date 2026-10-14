import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, noContent, ok } from '../utils/apiResponse';

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          images: { orderBy: { position: 'asc' as const } },
          category: true,
        },
      },
    },
  },
};

async function ensureCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId }, include: CART_INCLUDE });
  }
  return cart;
}

function summarize(cart: Awaited<ReturnType<typeof ensureCart>>) {
  const itemCount = cart.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = cart.items.reduce((n, i) => n + i.quantity * i.product.price, 0);
  return { ...cart, summary: { itemCount, subtotal: Number(subtotal.toFixed(2)) } };
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const cart = await ensureCart(req.user.id);
    ok(res, summarize(cart));
  } catch (err) {
    next(err);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { productId, quantity } = req.body as { productId: string; quantity: number };

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw ApiError.notFound('Product not found');
    if (product.stock < quantity) throw ApiError.badRequest(`Only ${product.stock} in stock`);

    const cart = await ensureCart(req.user.id);
    const existing = cart.items.find((i) => i.productId === productId);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) throw ApiError.badRequest(`Only ${product.stock} in stock`);
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    const updated = await ensureCart(req.user.id);
    ok(res, summarize(updated), 'Item added to cart');
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { itemId, quantity } = req.body as { itemId: string; quantity: number };

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, product: true },
    });
    if (!item || item.cart.userId !== req.user.id) throw ApiError.notFound('Cart item not found');
    if (quantity > item.product.stock) throw ApiError.badRequest(`Only ${item.product.stock} in stock`);

    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    const updated = await ensureCart(req.user.id);
    ok(res, summarize(updated));
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { itemId } = req.params;
    const item = await prisma.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
    if (!item || item.cart.userId !== req.user.id) throw ApiError.notFound('Cart item not found');
    await prisma.cartItem.delete({ where: { id: itemId } });
    const updated = await ensureCart(req.user.id);
    ok(res, summarize(updated));
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    noContent(res);
  } catch (err) {
    next(err);
  }
}
