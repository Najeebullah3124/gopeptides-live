import { Request, Response, NextFunction } from 'express';
import { renderSeoHtml } from '../services/seoHtmlService';
import { parseStoreUrl } from '../utils/seoPaths';

const botRegex = /Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Sogou|Exabot|facebot|facebookexternalhit|twitterbot|screaming frog|screamingfrog|ahrefsbot|semrushbot|semrush|siteauditbot|dotbot|petalbot|GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-User|anthropic-ai|PerplexityBot|Perplexity-User|Google-Extended|GoogleOther|CCBot|Bytespider|Amazonbot|Applebot-Extended|Applebot|meta-externalagent|meta-externalfetcher|cohere-ai|cohere-training-data-crawler|DuckAssistBot|Diffbot|YouBot|Timpibot|ImagesiftBot/i;

export const botDetector = async (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // Exclude static assets or API routes just in case
  if (req.originalUrl.startsWith('/api') || req.originalUrl.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
    return next();
  }

  // Allow query param ?_escaped_fragment_= or ?prerender=1 to force rendering for testing
  const forcePrerender = req.query._escaped_fragment_ !== undefined || req.query.prerender === '1';

  if (botRegex.test(userAgent) || forcePrerender) {
    try {
      const urlPath = req.path || '/';
      const search = req.url.includes('?') ? `?${req.url.split('?')[1]}` : '';
      const html = await renderSeoHtml(urlPath, search, req.get('host'), { includeBody: true });
      res.setHeader('Content-Language', parseStoreUrl(urlPath, search, req.get('host') || undefined).lang);
      return res.status(200).type('text/html').send(html);
    } catch (err) {
      console.error('[BotDetector] SEO HTML render failed, falling back to basic SSR', err);
      return next();
    }
  }

  next();
};
