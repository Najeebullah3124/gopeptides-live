import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * Separate shared secret from MCP/admin auth — this key lives in a small script running
 * on an office PC, not in Claude's hands, so it's scoped to only these two print-queue
 * endpoints rather than full admin access.
 */
function requirePrintAgentKey(req: Request, res: Response, next: () => void): void {
  const expected = process.env.PRINT_AGENT_API_KEY;
  if (!expected) {
    res.status(503).json({ error: 'Print agent is not configured (PRINT_AGENT_API_KEY missing).' });
    return;
  }
  const header = req.headers.authorization || '';
  const provided =
    (header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined) ||
    (req.query.key as string | undefined);
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Missing or invalid print agent key.' });
    return;
  }
  next();
}

router.use(requirePrintAgentKey);

// Polled every few seconds by the local agent — returns jobs it hasn't picked up yet.
router.get('/jobs/pending', async (_req: Request, res: Response) => {
  const jobs = await prisma.printJob.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { id: true, zpl: true, orderId: true, createdAt: true },
  });
  res.json({ success: true, data: jobs });
});

router.post('/jobs/:id/complete', async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = Boolean(req.body?.success);
  const error = typeof req.body?.error === 'string' ? req.body.error.slice(0, 500) : null;
  const job = await prisma.printJob.update({
    where: { id },
    data: {
      status: success ? 'PRINTED' : 'FAILED',
      error: success ? null : error || 'Unknown print agent error',
      printedAt: success ? new Date() : null,
    },
  }).catch(() => null);
  if (!job) {
    res.status(404).json({ error: 'Print job not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
