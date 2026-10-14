import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, created, noContent, ok } from '../utils/apiResponse';
import { hashPassword, verifyPassword } from '../utils/password';

function publicUser(u: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: (u.role === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw ApiError.notFound('User not found');
    ok(res, publicUser(user));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { firstName, lastName, email, phone } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== req.user.id) {
        throw ApiError.conflict('Email already in use');
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        ...(email && email !== req.user.email ? { emailVerified: false } : {}),
      },
    });
    ok(res, publicUser(user), 'Profile updated');
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw ApiError.notFound('User not found');

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw ApiError.badRequest('Current password is incorrect');

    const hash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true },
    });
    ok(res, null, 'Password updated. Please log in again on other devices.');
  } catch (err) {
    next(err);
  }
}

export async function listAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    ok(res, addresses);
  } catch (err) {
    next(err);
  }
}

interface AddressBody {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export async function createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as AddressBody;

    const result = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
      } else {
        const count = await tx.address.count({ where: { userId: req.user!.id } });
        if (count === 0) body.isDefault = true;
      }
      return tx.address.create({ data: { ...body, userId: req.user!.id } });
    });

    created(res, result, 'Address added');
  } catch (err) {
    next(err);
  }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const body = req.body as Partial<AddressBody>;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) throw ApiError.notFound('Address not found');

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user!.id, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data: body });
    });

    ok(res, updated, 'Address updated');
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) throw ApiError.notFound('Address not found');

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: req.user!.id } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    noContent(res);
  } catch (err) {
    next(err);
  }
}
