import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logAudit } from '../utils/audit';
import { ApiError, created, ok } from '../utils/apiResponse';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from '../services/emailService';
import { env } from '../config/env';

const REFRESH_COOKIE = 'gp_refresh';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

// `role` is `string` from SQLite (no enums). We narrow at the boundary.
type Role = 'USER' | 'ADMIN';
function asRole(r: string): Role {
  return r === 'ADMIN' ? 'ADMIN' : 'USER';
}

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
    role: asRole(u.role),
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}

async function issueTokens(user: { id: string; email: string; role: string }) {
  const access = signAccessToken({ sub: user.id, email: user.email, role: asRole(user.role) });
  const tokenId = generateOpaqueToken(16);
  const refresh = signRefreshToken({ sub: user.id, jti: tokenId });
  const tokenHash = hashToken(refresh);
  await prisma.refreshToken.create({
    data: {
      token: tokenHash,
      userId: user.id,
      expiresAt: refreshTokenExpiryDate(),
    },
  });
  return { access, refresh };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, phone } = req.body as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const hash = await hashPassword(password);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        firstName,
        lastName,
        phone,
        verificationToken,
      },
    });

    await sendVerificationEmail(user.email, user.firstName, verificationToken);
    await sendWelcomeEmail(user.email, user.firstName);

    const { access, refresh } = await issueTokens(user);
    setRefreshCookie(res, refresh);

    await logAudit({
      userId: user.id,
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress: req.ip,
    });

    created(res, { user: publicUser(user), accessToken: access }, 'Account created');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const valid = await verifyPassword(password, user.password);
    if (!valid) throw ApiError.unauthorized('Invalid email or password');

    const { access, refresh } = await issueTokens(user);
    setRefreshCookie(res, refresh);

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    ok(res, { user: publicUser(user), accessToken: access }, 'Logged in');
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookie = (req.cookies?.[REFRESH_COOKIE] as string | undefined) || (req.body?.refreshToken as string | undefined);
    if (cookie) {
      const tokenHash = hashToken(cookie);
      await prisma.refreshToken.updateMany({
        where: { token: tokenHash, revoked: false },
        data: { revoked: true },
      });
    }
    clearRefreshCookie(res);
    ok(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cookie = (req.cookies?.[REFRESH_COOKIE] as string | undefined) || (req.body?.refreshToken as string | undefined);
    if (!cookie) throw ApiError.unauthorized('No refresh token provided');

    let payload;
    try {
      payload = verifyRefreshToken(cookie);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokenHash = hashToken(cookie);
    const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired or revoked');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized('User no longer exists');

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const { access, refresh } = await issueTokens(user);
    setRefreshCookie(res, refresh);

    ok(res, { accessToken: access, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw ApiError.notFound('User not found');
    ok(res, publicUser(user));
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      await sendPasswordResetEmail(user.email, user.firstName, token);
    }

    ok(res, null, 'If an account exists for that email, a reset link has been sent.');
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code, password } = req.body as { email: string; code: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.resetToken !== code || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw ApiError.badRequest('Invalid or expired reset code');
    }
    const hash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetToken: null, resetTokenExpiry: null },
    });
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
    ok(res, null, 'Password updated. Please log in again.');
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.verificationToken !== code) throw ApiError.badRequest('Invalid verification code');
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationToken: null },
    });
    ok(res, null, 'Email verified');
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.emailVerified) throw ApiError.badRequest('Email is already verified');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: code },
    });
    await sendVerificationEmail(user.email, user.firstName, code);

    ok(res, null, 'Verification code sent');
  } catch (err) {
    next(err);
  }
}
