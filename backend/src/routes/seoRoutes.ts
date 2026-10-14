import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import {
  analyzeContent,
  createKeyword,
  createRedirect,
  deleteKeyword,
  deleteRedirect,
  getContentInventory,
  getDashboard,
  getIndexingStatus,
  getSchemaPreview,
  getSearchConsole,
  getMerchant,
  registerMerchantProject,
  updateMerchant,
  syncMerchant,
  getToolkit,
  listAudits,
  previewReadingTime,
  previewSlug,
  runHtmlAudit,
  listKeywords,
  listMedia,
  listImageMetadata,
  geotagImages,
  listRedirects,
  pingIndexNow,
  runLinkAudit,
  runLighthouseAudit,
  updateContentMeta,
  updateKeyword,
  updateMediaAlt,
  updateRedirect,
  convertImagesToWebp,
  getContentDetails,
  scanAnomalies,
  autoFixAnomalies,
  pingSitemaps,
  getRobotsTxt,
  updateRobotsTxt,
} from '../controllers/seoController';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/toolkit', getToolkit);
router.post('/toolkit/slug', previewSlug);
router.post('/toolkit/reading-time', previewReadingTime);
router.post('/toolkit/html-audit', runHtmlAudit);
router.get('/content', getContentInventory);
router.get('/content/:type/:id', getContentDetails);
router.put('/content/:type/:id', updateContentMeta);

router.get('/schema', getSchemaPreview);

router.get('/indexing', getIndexingStatus);

router.get('/media', listMedia);
router.get('/media/metadata', listImageMetadata);
router.put('/media/:id', updateMediaAlt);
router.post('/media/convert-webp', convertImagesToWebp);
router.post('/media/geotag', geotagImages);

router.get('/audits', listAudits);
router.post('/audits/links', runLinkAudit);
router.post('/audits/lighthouse', runLighthouseAudit);

router.get('/redirects', listRedirects);
router.post('/redirects', createRedirect);
router.put('/redirects/:id', updateRedirect);
router.delete('/redirects/:id', deleteRedirect);

router.get('/keywords', listKeywords);
router.post('/keywords', createKeyword);
router.put('/keywords/:id', updateKeyword);
router.delete('/keywords/:id', deleteKeyword);

router.post('/analyze', analyzeContent);
router.post('/indexnow', pingIndexNow);
router.get('/search-console', getSearchConsole);
router.get('/merchant', getMerchant);
router.put('/merchant', updateMerchant);
router.post('/merchant/register-project', registerMerchantProject);
router.post('/merchant/sync', syncMerchant);

router.get('/anomalies', scanAnomalies);
router.post('/anomalies/fix', autoFixAnomalies);
router.post('/ping-sitemaps', pingSitemaps);

router.get('/robots-txt', getRobotsTxt);
router.put('/robots-txt', updateRobotsTxt);

export default router;
