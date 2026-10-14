# Current Project State

*Last updated: 2026-06-25*

## Active Goal

Maintain an accurate memory snapshot for the GoPeptides / Nexipep e-commerce app so future agents can start from the documented architecture, active frontend/backend, recent work, and known gotchas before reading code.

Current implementation: SEO Admin Center with content, crawl, schema, indexing, media, redirect, and provider-setup modules.

## Current Deliverable

- A client-facing branch comparison report has been generated for `main` vs `development-02` in both Markdown and PDF formats: `Nexipep_Audit_Report.md` and `Nexipep_Audit_Report.pdf`.
- The report summarizes the last three days of work across SEO, product routing, blog publishing, labels, media optimization, and deployment support.

## Current Task Update

- Shared SEO head management was simplified so the client-side route updates mutate the existing document head instead of stacking duplicate title/meta/hreflang tags on top of the server-injected HTML.
- The server now injects a temporary offscreen H1 fallback into rendered storefront HTML and the client removes it on mount, so raw source crawls can see a heading without leaving a visible duplicate after hydration.
- Sitemap route names were re-aligned with the actual public endpoints, and a lightweight `/llms.txt` route was added for the crawler notice reported by Screaming Frog.
- Title formatting now avoids appending the site name to already-long titles, which should reduce the "too much text" warnings on long product and blog pages.
- Hero/background rendering was softened for first paint: the homepage now delays the background video until idle and uses a static gradient placeholder first, and key product/search/cart/blog images now declare dimensions with async decoding/lazy loading to cut layout shift and initial blocking work.
- The homepage now avoids loading the hero video on mobile, defers optional Google Analytics entirely, uses smaller fallback marketing images where available, and gives the logo explicit dimensions so Lighthouse stops flagging the obvious above-the-fold waste.
- Verified locally: backend TypeScript compilation passes, frontend typecheck passes, and the rendered SEO HTML for `/` currently contains exactly one title, one meta description, one canonical link, four hreflang links, and one H1 in the injected output.
- Verified locally across `/`, `/shop`, `/blog`, `/faq`, `/contact`, one active product, and one published blog post: each rendered page currently contains exactly one title, one meta description, one canonical link, four hreflang links, and one H1 in the injected output.

## Current Task

### Direct Product URLs, SEO Content, and Blog HTML (2026-06-23)

- Public product URLs are canonical at `/{product-slug}`. Legacy `/shop/peptides/:category/:slug` and `/product/:slug` URLs are permanent server-side redirects that preserve query strings.
- Product cards, search, cart, wishlist, reviews, footer, labels, QR generation, sitemap output, canonical metadata, breadcrumbs, JSON-LD, and SEO Center content updates use direct URLs.
- Product slugs reject reserved routes such as `admin`, `blog`, `shop`, `cart`, `api`, `robots.txt`, and `sitemap.xml`.
- Dynamic product sitemaps emit direct URLs. Category sitemaps retain localized `/shop?category={slug}` pages and are regenerated on every request.
- Language selection persists through navigation that does not explicitly set `?lang=`.
- Blog posts use TipTap HTML only. `marked` and Markdown fallback rendering were removed; the backend sanitizes the supported semantic HTML and safe URL schemes.
- Product and category editors now include SEO title/meta-description inputs backed by `seoData`; blog already has dedicated SEO fields.
- `why-tested`, `why-docs`, and `why-logistics` homepage images were converted to WebP and their references updated.
- Product slug repair now derives `name-dosage` (for example `tirzepatide-15mg`) instead of creating numeric suffixes. The SEO Center technical scan exposes the existing Auto-Fix action so saved products and the dynamic sitemap can be corrected together.
- Blog admin routes are registered before the public `/:slug` route; React Query create/update/delete calls were already correct, but the admin list request had been captured by the public slug handler.

### Admin Blog Editor (2026-06-24)

- The TipTap blog editor can now upload inline JPEG, PNG, WebP, and GIF images using the existing authenticated blog image endpoint; the existing featured-image upload remains available.
- The blog modal has a sandboxed live Preview tab. It renders the article title as the page's single H1 and renders editor content as H2-H4, paragraphs, lists, links, images, quotes, and code beneath it.
- English, Dutch, and German tabs all support inline image upload. Existing translated SEO title and description values now load correctly when editing a post.
- The title input is labelled as H1, the SEO tab is labelled `SEO Meta`, and the toolbar exposes StarterKit inline code, code block, and horizontal-rule controls in addition to its existing formatting controls.
- Public blog articles now use a scoped `blog-content` CSS renderer for the sanitized TipTap tags. The former Tailwind `prose` utilities did nothing because Tailwind Typography is not installed.
- Published blog posts are blocked unless they have 500+ words, at least one H2, a 30-70 character SEO title, a 120-160 character meta description, a featured image with alt text, and alt text on every inline image. Drafts remain editable.
- `BlogPost.featuredImageAlt` was added locally with `prisma db push`; its SQL migration is committed for a production database that has Prisma migration history.
- Admin Blog now has a `New category` control for a category name, generated/editable slug, and optional description. It reuses the existing category API and refreshes the post editor dropdown.
- SEO Center on-page audit now parses the existing Puppeteer-rendered storefront HTML, not the empty SPA shell. This removes false H1, H2, and internal-link findings for React pages. Redis is hidden from the SEO Performance package/status UI.
- All prior blog posts were replaced on 2026-06-24 with the requested eight research articles plus a new `Research Methods` article. The repeatable `npm run seed:blog-research` command validates each post before deleting and recreating the set.
- Live blog reseed on 2026-06-25 replaced the remaining stale featured-image URLs with local `/photos` fallbacks when an upload file is missing on disk, preventing the unsplash and dead `/uploads` links reported by Linkinator.

SEO Center phase 4 completed 2026-06-22 — library-backed reasoning on every tab:
- **Redirects actually work**: `seoRedirectMiddleware` enforces 301/302 from DB (was create-only before). Hits counted. Cache invalidated on CRUD.
- **Lighthouse**: extracts 100+ per-audit findings from LHR (title, description, score, displayValue, explanation) + Core Web Vitals metrics (LCP, CLS, TBT, FCP, SI).
- **Yoast**: returns every SeoAssessor + ContentAssessor result with `rating` (good/ok/bad), full `text`, and `library: yoastseo`. Blog posts analyzed with full `content` field.
- **Cheerio HTML audit**: 12+ checks each with `found`, `expected`, `fix`, `library` tag.
- **robots-parser**: indexing tab shows disallow rules + per-path Googlebot/Bingbot allow/block checks.
- **Linkinator**: returns `findings[]` with per-URL status, HTTP code, parent page.
- **Audit script**: 28 checks including redirect HTTP test, Yoast text validation, Lighthouse findings count.

## Label Rendering Update (2026-06-23)

- Default labels now render as one 40x20 mm canvas: the front and back each use a 20x20 mm half.
- The old output was 80x20 mm because it placed two full-size panels side-by-side. Printer-side compression caused the choppy result.
- Regenerate label assets after deployment with `cd backend && npm run generate:labels` so existing downloads are replaced.
- Added a separate centered layout preview: details left, branding/dosage center, barcode and QR right. Centered files use `-centered` names and do not replace standard labels.
- Preview fix deployed: production CSP blocks `blob:` images, so the admin converts preview PNG blobs to permitted `data:` URLs before rendering.

## Recently Changed Files

| File | Why |
|---|---|
| `backend/src/services/labelRenderService.ts` | Renders front/back at half-width on one configured-size physical label, instead of producing a double-width PNG/PDF. |
| `backend/src/controllers/labelAdminController.ts` | Supports independent `standard` and `centered` label preview/generation layouts. |
| `frontend-build/src/pages/admin/Labels.tsx` | Shows a centered-layout preview below the current preview with its own generation button. |
| `frontend-build/src/pages/admin/Labels.tsx` | Converts label preview blobs to CSP-compatible `data:` URLs. |
| `backend/scripts/checkCenteredLabel.ts` | Checks that the centered layout remains 40x20 mm at 300 DPI. |
| `backend/src/utils/seoPaths.ts` | Reworked: query-param locales (`?lang=en/de`), NL is default, hreflang/x-default → NL |
| `frontend-build/src/utils/seoPaths.ts` | Same logic for client-side canonical/hreflang |
| `backend/src/services/seoMetaService.ts` | Now passes `search` to `parseStoreUrl` |
| `backend/src/services/seoService.ts` | `writeLocalized` uses `localizedPath(path, lang, query)` |
| `backend/src/services/seoIntegrationsService.ts` | IndexNow auto-provisioned (UUID in SystemSetting); Google OAuth connect/exchange; Lighthouse unchanged |
| `backend/src/services/seoToolkitService.ts` | `auditRenderedPage` returns structured `checks[]` with actionable fix instructions |
| `backend/src/controllers/seoController.ts` | Added `convertImagesToWebp` endpoint |
| `backend/src/routes/seoRoutes.ts` | Added `POST /media/convert-webp` route |
| `frontend-build/src/pages/admin/SEO.tsx` | Actionable check cards, WebP button, mobile-responsive tab nav |
| `frontend-build/src/components/ui/RichTextEditor.tsx` | New TipTap WYSIWYG editor component |
| `frontend-build/src/pages/admin/Blog.tsx` | Replaced all 3 content textareas with RichTextEditor |
| `frontend-build/src/components/ui/RichTextEditor.tsx` | Adds inline blog-image upload while retaining URL insertion as a fallback. |
| `frontend-build/src/pages/admin/Blog.tsx` | Adds the safe article preview tab, connects all locale editors to image upload, and loads translated SEO fields on edit. |
| `frontend-build/src/components/ui/RichTextEditor.tsx` | Exposes the remaining safe StarterKit code and rule blocks without adding editor dependencies. |
| `frontend-build/src/pages/admin/Blog.tsx` | Makes the post H1 and SEO meta fields explicit in the admin UI. |
| `frontend-build/src/pages/BlogPost.tsx`, `frontend-build/src/index.css` | Replaces inactive Tailwind Typography classes with scoped public article HTML styles. |
| `backend/src/controllers/blogController.ts` | Enforces publication-time SEO and image-alt requirements. |
| `backend/scripts/checkBlogPublishGate.ts` | Small runnable check for the blog publication requirements. |
| `backend/scripts/reseedResearchBlogs.ts` | Atomically replaces all posts with the agreed nine SEO-validated research articles and preserves existing matching featured images where available. |
| `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260624130000_add_blog_featured_image_alt/migration.sql` | Stores featured image alt text and adds the deployable schema migration. |
| `frontend-build/src/components/ui/RichTextEditor.tsx`, `frontend-build/src/pages/admin/Blog.tsx` | Requires descriptive alt text while adding inline or featured blog images. |
| `frontend-build/src/pages/admin/Blog.tsx` | Adds the missing UI for existing blog category creation. |
| `backend/src/services/seoToolkitService.ts` | Audits rendered HTML and excludes Redis from the SEO Center package category output. |
| `frontend-build/src/pages/admin/SEO.tsx`, `pages/FAQ.tsx`, `pages/Contact.tsx`, `pages/Shop.tsx`, `pages/Blog.tsx` | Removes Redis status display and supplies auditable headings/metadata on affected public pages. |
| `frontend-build/src/services/seoService.ts` | Added `convertToWebp()` call |
| `backend/src/controllers/seoController.ts` | Dynamic IndexNow key route, Google OAuth handlers, Chrome auto-detect for Lighthouse, siteUrl in toolkit |
| `backend/src/app.ts` | Dynamic `/:key.txt` route; Google OAuth routes; warm-up `resolveIndexNowKey()` |
| `backend/src/config/env.ts` | Added `google` config block (clientId/secret/redirectUri/refreshToken) |
| `backend/.env` | Added SITE_URL, FRONTEND_DIST, GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI |
| `backend/src/controllers/translateController.ts` | Relaxed `targetLang` guard to any 2-letter code |
| `frontend-build/src/App.tsx` | Single `/` route tree (no more `/nl`/`/de` trees); legacy redirect for old prefix URLs |
| `frontend-build/src/components/layout/LangRouteSync.tsx` | Reads `?lang=` instead of path prefix |
| `frontend-build/src/hooks/useSetLang.ts` | Updates `?lang=` param; skips private routes |
| `frontend-build/src/hooks/usePageSeo.ts` | Uses updated `localizedPath` signature |
| `frontend-build/src/hooks/useAutoTranslate.ts` | Fires for nl/de only (extended langs use Google Translate widget) |
| `frontend-build/src/pages/admin/SEO.tsx` | Locale selector (NL/EN/DE); audits pass localized targetUrl; Yoast uses seoLang; GSC connect button; fixed Content & i18n panel |
| `frontend-build/tests/seo-rendering.spec.ts` | Updated for query-param locale URLs |

## Direct URL Change Files (2026-06-23)

| File | Reason |
|---|---|
| `backend/src/app.ts` | 301 redirects legacy public product paths to `/{product-slug}`. |
| `backend/src/controllers/productController.ts` | Reserved slug protection and normal product/category SEO metadata saves. |
| `backend/src/services/seoService.ts`, `seoMetaService.ts`, `seoSchemaService.ts` | Direct product sitemaps, canonicals, JSON-LD, and breadcrumbs. |
| `backend/src/controllers/blogController.ts` | Sanitizes allowed TipTap HTML before it is stored or exposed. |
| `frontend-build/src/App.tsx` and product-linking components/pages | Supports and links the direct product route everywhere. |
| `frontend-build/src/pages/admin/Products.tsx`, `Categories.tsx` | Adds title/meta description fields. |
| `frontend-build/src/pages/BlogPost.tsx`, `components/ui/RichTextEditor.tsx` | Removes Markdown presentation/source editing and renders TipTap HTML. |
| `frontend-build/src/components/home/WhyUs.tsx`, `public/photos/why-*.webp` | Uses the requested WebP home images. |
| `backend/src/services/seoToolkitService.ts`, `backend/src/controllers/seoController.ts` | Produces dosage-based product slugs during scan/repair and never invents `-1`, `-2` product slugs. |
| `frontend-build/src/pages/admin/SEO.tsx` | Re-enables the existing Auto-Fix button after a technical scan. |
| `backend/src/routes/blogRoutes.ts` | Registers blog admin CRUD endpoints before the public dynamic slug route. |

## Production Status

- Server `212.227.70.189` — PM2 `nexipep-backend` running
- **37 label variants** regenerated on server using `npm run generate:labels`; the 2026-06-23 renderer fix now outputs a true 40x20 mm canvas instead of 80x20 mm.
- Centered label layout deployed 2026-06-23: Admin Labels now shows the second preview and can generate `-centered` PNG/PDF assets without replacing standard labels.
- Category translations schema and endpoints fully deployed and database pushed
- Blog SEO update deployed 2026-06-24: frontend and backend rebuilt, featured-image alt schema synchronized with `prisma db push`, all blog rows reseeded, and PM2 restarted. Production storefront returned HTTP 200 and the public API returned nine valid published posts.
- SEO audit correction deployed 2026-06-24: frontend/backend rebuilt and PM2 restarted. Crawler-rendered production checks confirmed one H1, at least one H2, and 189+ internal links on `/`, `/shop`, `/blog`, `/faq`, and `/contact`.
- Blog image-link cleanup deployed 2026-06-25: the reseed script now falls back to stable local assets when an upload file is missing, and production blog rows were reseeded again to eliminate the remaining 404 image URLs.

## Local Dev Status

- Backend: `http://localhost:3001` (running)
- Frontend: `http://localhost:5173` (running, Vite proxy → backend)
- Verified 2026-06-22: SEO Center UI (8 tests), server-rendered SEO HTML (canonical/hreflang/JSON-LD on `:3001`)

## Important Files

### Agent Memory
- `AGENTS.md` — Read first; requires memory-first context and targeted file search
- `project-memory/current-state.md` — Current goals, changed files, known bugs, next steps
- `project-memory/architecture.md` — Stack, repo layout, request flow, deployment notes
- `project-memory/decisions.md` — Decision log and rationale

### Runtime Entry Points
- `backend/src/app.ts` — Express middleware, static uploads/products, public/admin API route mounting
- `backend/src/server.ts` — DB/Redis startup, HTTP listen, graceful shutdown
- `backend/src/config/env.ts` — Environment defaults and required settings
- `backend/src/config/database.ts` — Prisma client and SQLite JSON-string parsing extension
- `frontend-build/src/App.tsx` — React Router tree for shop, account, admin, blog, legal pages
- `frontend-build/vite.config.ts` — Vite alias and local `/api` + `/uploads` proxy

### E-commerce Core & Translations
- `frontend-build/src/pages/admin/Categories.tsx` — Category admin listing, translation tabs, and Auto-translate button
- `backend/src/controllers/productController.ts` — Categories/products endpoints with translation support
- `backend/prisma/schema.prisma` — Product, Category, and Label Variant schemas
- `frontend-build/src/i18n/translations.ts` — Locale dictionaries for English, Dutch, and German

### Peptide Label Generator
- `backend/src/services/labelRenderService.ts` — Image/PDF render pipeline (Sharp compositing, QR/barcode alignment)
- `backend/src/services/labelVariantHelpers.ts` — Dimensions, default brand colors, font embedding utilities
- `backend/scripts/generateAllLabels.ts` — Wipe & regenerate all labels on demand
- `frontend-build/src/pages/admin/Labels.tsx` — Admin UI: variant editor, preview, bulk generate
- `frontend-build/src/services/adminService.ts` — Label API client + `DEFAULT_LABEL_COLORS`

## Known Bugs / Gotchas

| Issue | Notes |
|---|---|
| **IndexNow skips submission on localhost** | `submitIndexNow` detects `localhost`/`127.0.0.1` in `siteUrl()` and returns a dev-mode result instead of calling external engines. Actual submission only runs in production with a public `SITE_URL`. |
| **Yoast API** | Fixed: must call `assessor.assess(paper)` (not `assess()`), read `assessor.results` + `assessor.calculateOverallScore()`. Paper must use `slug` not deprecated `url`. |
| **Lighthouse v12 API** | Fixed: v12 requires `chrome-launcher` to launch Chrome, pass `port` to Lighthouse (not `chromePath` flag). Chrome auto-detected at `C:\Program Files\Google\Chrome\Application\chrome.exe`. |
| **Memory files may already be staged** | `project-memory/*.md` had staged changes before this refresh; preserve useful existing content and avoid broad rewrites. |
| **No root package script** | Run backend/frontend commands from their own folders (`backend`, `frontend-build`). |
| **Logo lockups on generate** | Stop backend dev server to run `prisma generate` or `npm run build` locally due to query engine locking. |
| **Missing label backgrounds** | Make sure to deploy `backend/assets/` folder to production server, otherwise renderer throws errors. |
| **Frontend deploy order** | Express caches the SEO-injected `index.html` on startup. Upload frontend assets/index first, then restart `nexipep-backend`; otherwise it can serve an old hashed JS filename and leave the page blank. |
| **Label preview CSP** | Production allows `img-src 'self' data:` but not `blob:`. Use data URLs for authenticated label preview responses. |
| **Font UI partially disabled** | Color and font customization fields are commented out in `Labels.tsx`; values fallback to default Montserrat/DejaVu. |
| **NAD+ labels** | Uses portrait layout (30×60 mm). Dimensions resolved dynamically in `labelVariantHelpers.ts`. |

## Verification (local)

- 2026-06-23: `npm run lint` passed in both `frontend-build` and `backend`.
- 2026-06-23: frontend production build passed after granting Vite/esbuild normal filesystem access.
- 2026-06-23: backend TypeScript compilation passed. Prisma generation can fail with `EPERM` when another local process locks `node_modules/.prisma/client/query_engine-windows.dll.node`; stop local Node/Prisma processes before retrying the full backend build.
- 2026-06-23: `npx tsx scripts/checkProductSlug.ts` passed for single and combined dosages.
- 2026-06-24: `npm run lint` passed in `frontend-build` and `backend`; `npm run build` passed in `frontend-build` after the admin blog editor update.
- 2026-06-24: frontend `npm run lint` passed after exposing code block and horizontal-rule controls.
- 2026-06-24: frontend lint and production build passed after the public TipTap content style fix.
- 2026-06-24: frontend and backend TypeScript checks passed after the blog publication gate. Local backend restarted and returned HTTP 200.
- 2026-06-24: `npm run check:blog-seo` passed, covering valid and rejected publication payloads.
- 2026-06-24: frontend TypeScript check passed after adding blog category creation.
- 2026-06-24: `npm run seed:blog-research` completed locally and in production; production API verification found zero invalid SEO records.
- 2026-06-24: frontend/backend TypeScript checks and production frontend build passed for the rendered SEO audit correction; production crawler verification passed for all five audited routes.
- 2026-06-25: frontend and backend lint passed after the hero/image delivery adjustments. Full frontend build still hits the existing Vite/esbuild config resolution issue in this environment; backend build still hits the existing Prisma DLL rename lock while the dev server is running.
- 2026-06-25: backend lint passed after the blog reseed image fallback fix, and the production blog reseed script completed successfully on the server.

1. Build frontend: `cd frontend-build && npm run build`
2. Start backend: `cd backend && npm run dev` — serves on `:3001` with SEO-injected HTML
3. Browse `http://localhost:3001/` — Dutch default, no lang param
4. Browse `http://localhost:3001/?lang=en` — English version
5. Check `http://localhost:3001/sitemap.xml` — should include `?lang=en` and `?lang=de` URLs
6. Admin SEO Center: `http://localhost:5173/admin/seo` — click Off-Page → "Connect Google Search Console"
   - **Prerequisite**: add `http://localhost:3001/api/admin/seo/google/callback` to authorized redirect URIs in Google Cloud Console

## Next Steps

1. Deploy the direct-route changes with `DEPLOY.md`: upload frontend assets/index first, then restart `nexipep-backend` so cached SEO HTML points at the new hashed assets.
2. In production, verify an old nested product URL returns 301, a direct product URL returns 200, and `/sitemap-products.xml` plus `/sitemap-categories.xml` contain the new direct/category URLs. Then use the Admin SEO IndexNow action to notify search engines.

1. **Google Cloud Console**: add `http://localhost:3001/api/admin/seo/google/callback` and `https://gopeptides.nl/api/admin/seo/google/callback` as authorized redirect URIs.
2. **Deploy to production**: build frontend, set `SITE_URL=https://gopeptides.nl`, `GOOGLE_REDIRECT_URI=https://gopeptides.nl/api/admin/seo/google/callback` in server .env, update Nginx (see `DEPLOY.md`).
3. **Lighthouse**: install Chrome on the server or set `CHROME_PATH` in `.env` — it's optional, all other SEO Center features work without it.
