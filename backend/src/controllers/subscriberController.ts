import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, ok } from '../utils/apiResponse';
import { sendMail, sendSubscriptionEmail } from '../services/emailService';
import { notifyNewSubscriber } from '../services/notificationService';
import { env } from '../config/env';

export async function subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, name } = req.body as { email: string; name?: string };
    const displayName = name?.trim() || null;

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing) {
      ok(res, null, 'Already subscribed');
      return;
    }

    await prisma.subscriber.create({ data: { email, name: displayName } });

    // ponytail: fire-and-forget admin alerts — never block / fail the public subscribe response
    void Promise.all([
      env.admin.email
        ? sendMail(
            env.admin.email,
            '[GoPeptides] New newsletter subscriber',
            `<p><strong>Email:</strong> ${email}</p>${displayName ? `<p><strong>Name:</strong> ${displayName}</p>` : ''}`,
          )
        : Promise.resolve(),
      notifyNewSubscriber(email, displayName),
      sendSubscriptionEmail(email, displayName),
    ]).catch((e) => console.error('[subscribe] admin notify failed:', e));

    ok(res, null, 'Subscribed successfully');
  } catch (err) {
    next(err instanceof Error ? err : ApiError.internal('Subscription failed'));
  }
}
