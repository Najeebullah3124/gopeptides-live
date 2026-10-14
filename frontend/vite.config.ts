import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Inlines the entry CSS into index.html as a <style> tag, replacing the
 * render-blocking stylesheet request entirely. The CSS has no url() refs,
 * so it is location-independent. Total page bytes stay the same (the HTML
 * is compressed in transit) but first paint no longer waits on a second
 * round trip on the critical path.
 */
function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        let out = html;
        for (const asset of Object.values(ctx.bundle)) {
          if (asset.type !== 'asset' || !asset.fileName.endsWith('.css')) continue;
          const escaped = asset.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const linkRe = new RegExp(`<link[^>]*href="/${escaped}"[^>]*>\\s*`, 'g');
          if (!linkRe.test(out)) continue; // only inline CSS actually linked from index.html
          const source = typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8');
          out = out.replace(linkRe, '');
          out = out.replace('</head>', `<style>${source}</style></head>`);
        }
        return out;
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCssPlugin()],
  build: {
    sourcemap: true,
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('zod') || id.includes('@hookform') || id.includes('react-hook-form')) return 'forms';
          if (id.includes('@remix-run/router') || id.includes('react-router')) return 'router';
          if (id.includes('@tanstack/react-query')) return 'query';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/sitemap.xsl': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/post-sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/page-sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/product-sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/product_cat-sitemap.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/merchant.xml': {
        target: process.env.VITE_API_PROXY || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
