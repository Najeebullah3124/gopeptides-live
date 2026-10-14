import { prisma } from '../config/database';

export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadata: JSON.stringify(params.metadata || {}),
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err);
  }
}
