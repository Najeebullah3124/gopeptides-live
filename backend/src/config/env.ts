import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  siteUrl: (process.env.SITE_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  frontendDist: process.env.FRONTEND_DIST || path.resolve(process.cwd(), '..', 'frontend-build', 'dist'),

  databaseUrl: required('DATABASE_URL'),
  // Redis is optional. Leave REDIS_URL empty (or unset) to run without caching.
  redisUrl: process.env.REDIS_URL || '',

  jwt: {
    accessSecret: required('JWT_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  wallid: {
    keyId: process.env.WALLID_KEY_ID || '',
    keySecret: process.env.WALLID_KEY_SECRET || '',
    apiBaseUrl: process.env.WALLID_API_BASE_URL || 'https://payment-api.wallid.co',
    paymentType: process.env.WALLID_PAYMENT_TYPE || 'CUSTOM',
  },

  ecomtrade24: {
    apiKey: process.env.ECOMTRADE24_API_KEY || '',
    webhookSecret: process.env.ECOMTRADE24_WEBHOOK_SECRET || '',
    apiBaseUrl: process.env.ECOMTRADE24_API_BASE_URL || 'https://pay.ecomtrade24.com',
    shopDomain: process.env.ECOMTRADE24_SHOP_DOMAIN || 'gopeptides.nl',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'GoPeptides <noreply@gopeptides.nl>',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'gopeptides1@gmail.com',
    password: process.env.ADMIN_PASSWORD || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || '',
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    placeId: process.env.GOOGLE_PLACE_ID || '',
    placeAddress: process.env.GOOGLE_PLACE_ADDRESS || '',
    placeShareUrl: process.env.GOOGLE_PLACE_SHARE_URL || '',
  },

  merchant: {
    accountId: process.env.GOOGLE_MERCHANT_ACCOUNT_ID || '',
    dataSourceId: process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID || '10681156555',
    feedLabel: process.env.GOOGLE_MERCHANT_FEED_LABEL || 'NL',
    contentLanguage: process.env.GOOGLE_MERCHANT_CONTENT_LANGUAGE || 'nl',
  },

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
};
