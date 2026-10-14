import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, noContent, ok } from '../utils/apiResponse';
import { logAudit } from '../utils/audit';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;

    const where: Record<string, any> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    ok(res, { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
        },
        addresses: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } },
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    ok(res, user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: string };

    if (!['USER', 'ADMIN'].includes(role)) throw ApiError.badRequest('Invalid role');

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE_ROLE',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    ok(res, user, 'User role updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const requesterId = (req as Request & { user?: { id: string } }).user?.id;
    if (requesterId === id) throw ApiError.badRequest('Cannot delete your own account');
    const user = await prisma.user.delete({ where: { id }, select: { email: true } });

    await logAudit({
      userId: requesterId,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      metadata: { email: user.email },
      ipAddress: req.ip,
    });

    noContent(res);
  } catch (err) {
    next(err);
  }
}
