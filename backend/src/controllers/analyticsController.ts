import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/database';
import { ok } from '../utils/apiResponse';
import { logAudit } from '../utils/audit';

// ... getDashboardStats implementation follows ...

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast30,
      totalOrders,
      newOrdersLast30,
      totalRevenue,
      revenueLast30,
      totalProducts,
      activeProducts,
      totalBlogPosts,
      publishedBlogPosts,
      productViewsLast30,
      topProducts,
      recentAuditLogs,
      ordersByStatus,
      topPagesRaw,
      pageViewsLast30,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
      prisma.productView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.productView.groupBy({
        by: ['productId'],
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 5,
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      // Most-visited pages (last 30 days)
      prisma.auditLog.groupBy({
        by: ['entityId'],
        where: { action: 'VIEW_PAGE', createdAt: { gte: thirtyDaysAgo } },
        _count: { entityId: true },
        orderBy: { _count: { entityId: 'desc' } },
        take: 10,
      }),
      // Total page views (last 30 days)
      prisma.auditLog.count({ where: { action: 'VIEW_PAGE', createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // Enrich top products with names
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, slug: true },
    });
    const productMap = new Map(topProductDetails.map((p) => [p.id, p]));

    const enrichedTopProducts = topProducts.map((p) => ({
      productId: p.productId,
      views: p._count.productId,
      product: productMap.get(p.productId) || null,
    }));

    // Daily order counts for last 7 days
    const dailyOrders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { orders: 0, revenue: 0 };
    }
    dailyOrders.forEach((o) => {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (dailyMap[key]) {
        dailyMap[key].orders += 1;
        dailyMap[key].revenue += o.total;
      }
    });

    // Fetch users for recentAuditLogs
    const userIds = Array.from(new Set(recentAuditLogs.map((l) => l.userId).filter(Boolean))) as string[];
    const usersList = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(usersList.map((u) => [u.id, u]));

    const enrichedAuditLogs = recentAuditLogs.map((l) => ({
      ...l,
      metadata: (() => { try { return JSON.parse(l.metadata); } catch { return {}; } })(),
      user: l.userId ? userMap.get(l.userId) || null : null,
    }));

    ok(res, {
      users: { total: totalUsers, newLast30: newUsersLast30 },
      orders: {
        total: totalOrders,
        newLast30: newOrdersLast30,
        byStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count.status })),
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
        last30: revenueLast30._sum.total || 0,
      },
      products: { total: totalProducts, active: activeProducts },
      blog: { total: totalBlogPosts, published: publishedBlogPosts },
      productViews: { last30: productViewsLast30, topProducts: enrichedTopProducts },
      pageViews: {
        last30: pageViewsLast30,
        topPages: topPagesRaw.map((p) => ({ path: p.entityId, views: p._count.entityId })),
      },
      dailyActivity: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })),
      recentAuditLogs: enrichedAuditLogs,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const skip = (page - 1) * limit;
    const entity = req.query.entity as string | undefined;
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (search) where.entityId = { contains: search };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
    const usersList = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(usersList.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((l) => ({
      ...l,
      metadata: (() => { try { return JSON.parse(l.metadata); } catch { return {}; } })(),
      user: l.userId ? userMap.get(l.userId) || null : null,
    }));

    ok(res, {
      data: enrichedLogs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

// Record a product view (called from product detail page)
export async function trackProductView(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    const sessionId = req.headers['x-session-id'] as string | undefined;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true } });
    if (!product) {
      res.status(200).json({ ok: true });
      return;
    }

    await prisma.productView.create({
      data: { productId, userId: userId || null, sessionId: sessionId || null },
    });

    await logAudit({
      userId: userId || null,
      action: 'VIEW_PRODUCT',
      entity: 'Product',
      entityId: productId,
      metadata: { productName: product.name },
      ipAddress: req.ip,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Record a general page view
export async function trackPageView(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { path } = req.body as { path: string };
    if (!path || typeof path !== 'string') { res.status(200).json({ ok: true }); return; }
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    await logAudit({
      userId: userId || null,
      action: 'VIEW_PAGE',
      entity: 'Page',
      entityId: path,
      metadata: { path },
      ipAddress: req.ip,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Record a custom click/interaction event (e.g. ADD_TO_CART, CLICK_CTA)
export async function trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, label, path, entityId } = req.body as {
      action?: string; label?: string; path?: string; entityId?: string;
    };
    if (!action || typeof action !== 'string') { res.status(200).json({ ok: true }); return; }
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    await logAudit({
      userId: userId || null,
      action: action.slice(0, 60),
      entity: 'Event',
      entityId: (entityId || label || '').slice(0, 200) || null,
      metadata: { label, path },
      ipAddress: req.ip,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
