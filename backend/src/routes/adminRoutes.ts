import { Router } from 'express';
import { listUsers, getUserById, updateUserRole, deleteUser } from '../controllers/adminUserController';
import { getDashboardStats, getAuditLogs, trackProductView } from '../controllers/analyticsController';
import { autoTranslate } from '../controllers/translateController';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { prisma } from '../config/database';
import { ok, ApiError } from '../utils/apiResponse';
import { cache } from '../services/cacheService';
import {
  listLabelVariants,
  createLabelVariant,
  deleteLabelVariant,
  updateLabelVariant,
  importLabelQrCsv,
  generateLabelAssets,
  downloadLabelAsset,
  deleteLabelAsset,
  clearLabelVariantAssets,
  printLabelVariant,
  listGoogleFonts,
  previewLabelVariant,
} from '../controllers/labelAdminController';
import {
  listAdmin as listContactMessages,
  markRead as markContactRead,
  remove as removeContactMessage,
} from '../controllers/contactController';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

// Users
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Analytics
router.get('/analytics/stats', getDashboardStats);
router.get('/analytics/audit-logs', getAuditLogs);

// Subscribers
router.get('/subscribers', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const search = (req.query.search as string || '').trim();
    const limit = 50;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { email: { contains: search } },
        { name: { contains: search } }
      ]
    } : {};

    const [data, total] = await Promise.all([
      prisma.subscriber.findMany({ 
        where, 
        orderBy: { subscribedAt: 'desc' }, 
        skip, 
        take: limit 
      }),
      prisma.subscriber.count({ where }),
    ]);
    ok(res, { data, meta: { total, page, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.delete('/subscribers/:id', async (req, res, next) => {
  try {
    await prisma.subscriber.delete({ where: { id: req.params.id } });
    ok(res, null, 'Deleted');
  } catch (err) { next(err); }
});

// Contact / support inbox (from public contact form)
router.get('/contact-messages', listContactMessages);
router.patch('/contact-messages/:id/read', markContactRead);
router.delete('/contact-messages/:id', removeContactMessage);

// Auto-translate (Google Translate)
router.post('/translate', autoTranslate);

// Categories CRUD
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    ok(res, categories);
  } catch (err) { next(err); }
});

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

router.post('/categories', async (req, res, next) => {
  try {
    const { name, slug, description, translations } = req.body;
    if (!name || !slug) {
      throw ApiError.badRequest('Name and slug are required');
    }
    const normalized = String(slug).trim().toLowerCase();
    if (!CATEGORY_SLUG_PATTERN.test(normalized)) {
      throw ApiError.badRequest('Category slug must be lowercase letters, numbers, and single dashes only.');
    }
    const existing = await prisma.category.findUnique({ where: { slug: normalized } });
    if (existing) {
      throw ApiError.conflict('Category with this slug already exists');
    }
    const category = await prisma.category.create({
      data: {
        name,
        slug: normalized,
        description,
        translations: typeof translations === 'object' ? JSON.stringify(translations) : (translations || '{}')
      }
    });
    await cache.invalidateProducts();
    ok(res, category, 'Category created');
  } catch (err) { next(err); }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, translations } = req.body;
    if (!name || !slug) {
      throw ApiError.badRequest('Name and slug are required');
    }
    const normalized = String(slug).trim().toLowerCase();
    if (!CATEGORY_SLUG_PATTERN.test(normalized)) {
      throw ApiError.badRequest('Category slug must be lowercase letters, numbers, and single dashes only.');
    }
    const existing = await prisma.category.findFirst({
      where: { slug: normalized, id: { not: id } }
    });
    if (existing) {
      throw ApiError.conflict('Category with this slug already exists');
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: normalized,
        description,
        translations: typeof translations === 'object' ? JSON.stringify(translations) : (translations || '{}')
      }
    });
    await cache.invalidateProducts();
    ok(res, category, 'Category updated');
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });
    if (productCount > 0) {
      throw ApiError.badRequest('Cannot delete category with associated products');
    }
    await prisma.category.delete({ where: { id } });
    await cache.invalidateProducts();
    ok(res, null, 'Category deleted');
  } catch (err) { next(err); }
});
// Peptide label generator
router.get('/labels/variants', listLabelVariants);
router.get('/labels/google-fonts', listGoogleFonts);
router.post('/labels/preview', previewLabelVariant);
router.post('/labels/variants', createLabelVariant);
router.patch('/labels/variants/:id', updateLabelVariant);
router.delete('/labels/variants/:id', deleteLabelVariant);
router.post('/labels/qr-import', importLabelQrCsv);
router.post('/labels/generate', generateLabelAssets);
router.get('/labels/assets/:id/download', downloadLabelAsset);
router.delete('/labels/assets/:id', deleteLabelAsset);
router.delete('/labels/variants/:id/assets', clearLabelVariantAssets);
router.post('/labels/print', printLabelVariant);

export default router;

// Product view tracking (public, optional auth)
export { trackProductView };
