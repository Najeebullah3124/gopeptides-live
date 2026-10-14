import express, { Express, Request, Response } from 'express';import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';

import { env } from './config/env';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import { autoTranslate } from './controllers/translateController';
import authRoutes from './routes/authRoutes';
import { optionalAuth } from './middleware/auth';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import userRoutes from './routes/userRoutes';
import reviewRoutes from './routes/reviewRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import couponRoutes from './routes/couponRoutes';
import contactRoutes from './routes/contactRoutes';
import subscriberRoutes from './routes/subscriberRoutes';
import blogRoutes from './routes/blogRoutes';
import adminRoutes, { trackProductView } from './routes/adminRoutes';
import { trackPageView, trackEvent } from './controllers/analyticsController';
import settingsRoutes from './routes/settingsRoutes';
import seoRoutes from './routes/seoRoutes';
import mcpRouter from './mcp/router';
import mcpOauthRouter from './mcp/oauth';
import printAgentRoutes from './routes/printAgentRoutes';
import { publicIndexNowKey, publicRobots, publicLlmsTxt, publicSitemapIndex, publicPostSitemap, publicPageSitemap, publicProductSitemap, publicProductCatSitemap, googleOAuthConnect, googleOAuthCallback, checkRedirectAndLog404, serveSeoHtml, publicSitemapXsl, publicMerchantFeed, publicMerchantXml } from './controllers/seoController';
import { resolveIndexNowKey } from './services/seoIntegrationsService';
import { seoRedirectMiddleware } from './middleware/seoRedirect';
import { botDetector } from './middleware/botDetector';


import { stripeWebhook } from './controllers/paymentController';
import { wallidWebhook } from './controllers/paymentController';
import { ecomtrade24Webhook } from './controllers/paymentController';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.googletagmanager.com', 'https://js.stripe.com', 'https://www.google-analytics.com', 'https://ssl.google-analytics.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:', 'https://www.google-analytics.com', 'https://*.google-analytics.com'],
          fontSrc: ["'self'", 'https:', 'data:'],
          connectSrc: ["'self'", 'https:', 'https://api.stripe.com', 'https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
          frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com', 'https://js.stripe.com', 'https://hooks.stripe.com'],
          frameAncestors: ["'self'"],
        },
      } : false,
      hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // ponytail: after helmet so www→apex 301 still gets HSTS (SF flags www without it)
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    if (host.toLowerCase().startsWith('www.')) {
      res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
      return;
    }
    next();
  });

  const staticSecurityHeaders = (res: Response): void => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (env.isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://js.stripe.com https://www.google-analytics.com https://ssl.google-analytics.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob: https://www.google-analytics.com https://*.google-analytics.com; font-src 'self' https: data:; connect-src 'self' https: https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; frame-src 'self' https://www.google.com https://maps.google.com https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'self'");
    }
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed = [env.clientUrl, 'http://localhost:5173', 'http://localhost:3000'];
        const isAllowedDomain = origin && /^(https?:\/\/)?(www\.)?gopeptides\.(nl|de|be|eu)$/i.test(origin);
        if (!origin || allowed.includes(origin) || isAllowedDomain) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(cookieParser());

  if (env.isDevelopment) app.use(morgan('dev'));

  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response, next) => {
      (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    stripeWebhook,
  );

  app.post(
    '/api/payments/wallid-webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response, next) => {
      (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    wallidWebhook,
  );

  app.post(
    '/api/payments/ecomtrade24-webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response, next) => {
      (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    ecomtrade24Webhook,
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use('/uploads', express.static(path.resolve(env.upload.dir), { setHeaders: staticSecurityHeaders }));
  // Also serve at /api/uploads so proxy setups that keep the /api prefix still work
  app.use('/api/uploads', express.static(path.resolve(env.upload.dir), { setHeaders: staticSecurityHeaders }));

  // Extension-free media URL — nginx static *.ext rule 404s /uploads/foo.png before Express.
  app.get('/api/files/:token', (req, res) => {
    try {
      let b64 = String(req.params.token).replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const raw = Buffer.from(b64, 'base64').toString('utf8');
      if (!raw.startsWith('/uploads/') || raw.includes('..') || raw.includes('\\')) {
        res.status(404).end();
        return;
      }
      const fileName = path.basename(raw);
      const uploadRoot = path.resolve(env.upload.dir);
      const abs = path.resolve(uploadRoot, fileName);
      if (!abs.startsWith(uploadRoot + path.sep) && abs !== uploadRoot) {
        res.status(404).end();
        return;
      }
      res.sendFile(abs, (err) => {
        if (err && !res.headersSent) res.status(404).end();
      });
    } catch {
      res.status(404).end();
    }
  });

  const productImagesDir = path.resolve(process.cwd(), '..', 'frontend-build', 'public', 'products');
  app.use('/products', express.static(productImagesDir, { setHeaders: staticSecurityHeaders }));
  // Production: also serve mirrored uploads from FRONTEND_DIST/products
  app.use('/products', express.static(path.resolve(env.frontendDist, 'products'), { setHeaders: staticSecurityHeaders }));

  app.use('/api', globalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), env: env.nodeEnv });
  });

  app.get('/robots.txt', publicRobots);
  app.get('/llms.txt', publicLlmsTxt);
  app.get('/sitemap.xml', publicSitemapIndex);
  app.get('/sitemap.xsl', publicSitemapXsl);
  app.get('/post-sitemap.xml', publicPostSitemap);
  app.get('/page-sitemap.xml', publicPageSitemap);
  app.get('/product-sitemap.xml', publicProductSitemap);
  app.get('/product_cat-sitemap.xml', publicProductCatSitemap);
  app.get('/api/feeds/merchant/products', publicMerchantFeed);
  app.get('/merchant.xml', publicMerchantXml);

  // Warm up IndexNow key so getIndexNowKey() sync calls work immediately
  resolveIndexNowKey().catch(() => undefined);

  // Serve the IndexNow key file dynamically — key may be auto-generated at startup
  app.get('/:key([0-9a-f]{32}).txt', publicIndexNowKey);

  // Google Search Console OAuth helpers
  app.get('/api/admin/seo/google/connect', googleOAuthConnect);
  app.get('/api/admin/seo/google/callback', googleOAuthCallback);

  app.get('/api', (_req, res) => {
    res.json({
      name: 'GoPeptides API',
      version: '1.0.0',
      endpoints: [
        '/api/auth',
        '/api/products',
        '/api/cart',
        '/api/orders',
        '/api/payments',
        '/api/users',
        '/api/reviews',
        '/api/wishlist',
        '/api/coupons',
        '/api/contact',
      ],
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/subscribe', subscriberRoutes);

  // Public translate endpoint — no auth needed, used by frontend for product descriptions
  app.post('/api/translate', autoTranslate);
  // Public SEO redirect check and 404 logger
  app.get('/api/seo/check-redirect', checkRedirectAndLog404);
  app.use('/api/blog', blogRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/seo', seoRoutes);
  app.use('/api/settings', settingsRoutes);
  // Remote MCP server — lets Claude (or any MCP client) manage the whole store: products,
  // blog, SEO, categories, orders, coupons, reviews, users, settings. Gated by MCP_API_KEY.
  app.use('/api/mcp', mcpRouter);
  // OAuth wrapper for MCP clients (e.g. claude.ai) that require a sign-in handshake before
  // connecting — .well-known paths must live at the site root, not under /api.
  app.use(mcpOauthRouter);
  // Local print agent queue — office PC polls this for pending Zebra shipping labels.
  // Gated by PRINT_AGENT_API_KEY, a separate secret from the MCP/admin auth.
  app.use('/api/print-agent', printAgentRoutes);
  // Activity tracking — optionalAuth so logged-in users are attributed, anonymous still logged.
  app.post('/api/products/:productId/view', optionalAuth, trackProductView);
  app.post('/api/analytics/page-view', optionalAuth, trackPageView);
  app.post('/api/analytics/event', optionalAuth, trackEvent);

  app.get(['/shop/peptides/:category/:slug', '/product/:slug'], (req, res) => {
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    res.redirect(301, `/${req.params.slug}${query}`);
  });

  app.use(seoRedirectMiddleware);

  app.use(botDetector);
  app.use(express.static(path.resolve(env.frontendDist), { index: false, fallthrough: true, setHeaders: staticSecurityHeaders }));
  app.get('*', serveSeoHtml);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
