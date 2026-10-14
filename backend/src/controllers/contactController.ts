import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ApiError, ok } from '../utils/apiResponse';
import { sendMail } from '../services/emailService';
import { env } from '../config/env';

function escapeHtml(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
}

export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, subject, message } = req.body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    const row = await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    // ponytail: admin inbox is source of truth; email is best-effort so SMTP blips don't lose the message
    if (env.admin.email) {
      const html = `
        <h2>New contact message</h2>
        <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr/>
        <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
      `;
      void sendMail(env.admin.email, `[GoPeptides Contact] ${subject}`, html).catch((e) =>
        console.error('[contact] admin email failed:', e),
      );
    }

    ok(res, { id: row.id }, "Message received — we'll reply within one business day.");
  } catch (err) {
    next(err instanceof Error ? err : ApiError.internal('Failed to send'));
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const search = String(req.query.search || '').trim();
    const limit = 50;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } },
            { subject: { contains: search } },
            { message: { contains: search } },
          ],
        }
      : {};

    const [data, total, unread] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    ok(res, { data, meta: { total, page, pages: Math.ceil(total / limit) || 1, unread } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const row = await prisma.contactMessage.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    });
    ok(res, row);
  } catch (err) {
    next(err instanceof Error ? err : ApiError.notFound('Message not found'));
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.contactMessage.delete({ where: { id: req.params.id } });
    ok(res, null, 'Deleted');
  } catch (err) {
    next(err instanceof Error ? err : ApiError.notFound('Message not found'));
  }
}
