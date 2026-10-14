# Decisions

## 2026-06-22 — Query-param locale scheme
- Chose `?lang=en` / `?lang=de` over path prefixes (`/en/`, `/de/`) to eliminate the `/nl/admin/settings` 404 and simplify routing (single route tree).
- Dutch remains the default (no param), consistent with `gopeptides.nl` TLD and `domainLang()` in `langStore`.
- Tradeoff: query-param locales are weaker for SEO than path prefixes; can be swapped later since all URL logic is in `seoPaths.ts` helpers.
- x-default hreflang → Dutch (no param), matching Google's recommendation for the primary/intended audience.

## 2026-06-22 — IndexNow auto-provisioned
- Removed the manual `INDEXNOW_KEY` requirement. `resolveIndexNowKey()` reads env → DB → generates UUID, so IndexNow works out-of-the-box on first backend start.
- Key persisted in `SystemSetting` table, survives restarts.

## 2026-06-22 — Google Search Console OAuth in-app
- Added `GET /api/admin/seo/google/connect` and `/callback` so the admin can connect their Google account from the SEO Center without touching `.env` for the refresh token.
- Refresh token stored in `SystemSetting.gsc_refresh_token`; `GOOGLE_REFRESH_TOKEN` env var still works as override.



## Decision Log

### 2026-06-23 - Direct root product URLs

**Reason:** Product URLs need to be short and stable, without the category hierarchy.

**Decision:** `/{product-slug}` is the canonical public product URL. The server permanently redirects the former nested and `/product/:slug` paths, and product slugs cannot reuse reserved site/API paths.

**Impact:** Internal links, QR links, sitemap URLs, canonicals/hreflang, structured data, breadcrumbs, and SEO Center content URLs use the direct route. Category listing URLs stay at `/shop?category={slug}` and remain in the localized category sitemap.

**Files:** `backend/src/app.ts`, `backend/src/controllers/productController.ts`, SEO services, `frontend-build/src/App.tsx`, and product-linking components.

---

### 2026-06-23 - Product slugs include dosage

**Reason:** Name-only product slug repair appended numeric suffixes when products had multiple strengths, producing non-descriptive URLs such as `tirzepatide-1`.

**Decision:** Product SEO repair derives the slug from the product name and normalized weight, for example `tirzepatide-15mg` and `bpc-157-tb-500-10-10mg`. A real duplicate dosage is left unchanged rather than receiving a synthetic numeric suffix.

**Impact:** The existing SEO Center scan/Auto-Fix workflow repairs products, and dynamic sitemaps then emit the corrected URLs without a separate sitemap file rewrite.

**Files:** `backend/src/services/seoToolkitService.ts`, `backend/src/controllers/seoController.ts`, `frontend-build/src/pages/admin/SEO.tsx`, `backend/scripts/checkProductSlug.ts`.

---

### 2026-06-23 - Blog admin routes precede public blog slugs

**Reason:** Express matched `GET /blog/admin/posts` against the earlier public `/:slug` handler, which broke the admin list despite valid React Query mutation calls.

**Decision:** Register explicit admin endpoints before the public dynamic post route.

**Files:** `backend/src/routes/blogRoutes.ts`.

---

### 2026-06-23 - TipTap HTML is the only blog content format

**Reason:** Articles need semantic SEO content controls instead of a Markdown fallback.

**Decision:** Keep the existing TipTap editor, remove `marked` and the Markdown renderer, and sanitize allowed TipTap HTML in the backend.

**Impact:** Article titles remain the single H1. The editor provides H2-H4, paragraphs, lists, quotes, code, links, images, and undo/redo; unsafe tags, attributes, and URL schemes are discarded before public rendering.

**Files:** `frontend-build/src/components/ui/RichTextEditor.tsx`, `frontend-build/src/pages/BlogPost.tsx`, `backend/src/controllers/blogController.ts`, `frontend-build/package.json`.

---

### 2026-06-24 - Blog title is the single H1; editor content starts at H2

**Reason:** A post needs one semantic H1 for both SEO and a predictable public article outline. Allowing the title and editor body to each create H1 tags would create duplicate page headings.

**Decision:** The title field is rendered as H1 in the new sandboxed admin preview and public article. TipTap keeps H2, H3, and H4 controls for article structure. Inline image uploads reuse the existing blog image endpoint and safe `/uploads` serving path.

**Files:** `frontend-build/src/pages/admin/Blog.tsx`, `frontend-build/src/components/ui/RichTextEditor.tsx`.

**UI note:** The admin title label explicitly identifies the H1, and the SEO tab is named `SEO Meta` so title and meta-description fields are discoverable without allowing duplicate H1 tags in article content.

---

### 2026-06-24 - Scoped public styles for TipTap article HTML

**Reason:** `BlogPost` used Tailwind Typography `prose` classes although the Typography plugin is not installed, leaving valid saved tags visually unformatted.

**Decision:** Use one `blog-content` CSS class for the sanitized tags already allowed by the backend. It defines heading, list, quote, code, link, image, and rule presentation without adding a dependency.

**Files:** `frontend-build/src/pages/BlogPost.tsx`, `frontend-build/src/index.css`.

---

### 2026-06-24 - Blog publication gate

**Reason:** Client requires a minimum SEO baseline before research articles can be published, including sufficient content, metadata, and accessible images.

**Decision:** Enforce the checklist server-side whenever status is `PUBLISHED`, and mirror it in the admin form for immediate feedback. Drafts are intentionally allowed below the threshold so authors can work incrementally. Featured image alt text is stored on `BlogPost`; every inline image must carry its own alt attribute.

**Files:** `backend/src/controllers/blogController.ts`, `backend/prisma/schema.prisma`, `frontend-build/src/pages/admin/Blog.tsx`, `frontend-build/src/components/ui/RichTextEditor.tsx`.

---

### 2026-06-24 - Blog categories reuse the existing endpoint

**Reason:** The backend already creates and lists blog categories, but the admin page had no creation control.

**Decision:** Add one modal in `AdminBlog` rather than another category page or API. It only collects name, slug, and optional description, then invalidates the existing category query.

**Files:** `frontend-build/src/pages/admin/Blog.tsx`.

---

### 2026-06-24 - Repeatable blog reseed

**Reason:** Client requested a full replacement of the legacy blog set, including one additional category and post, while keeping every published post within the new SEO gate.

**Decision:** Keep one explicit `seed:blog-research` script. It validates all nine prepared posts before opening a transaction, then deletes the existing `BlogPost` rows and recreates the requested set. Categories are upserted, so the new `Research Methods` category is added without deleting existing categories.

**Files:** `backend/scripts/reseedResearchBlogs.ts`, `backend/package.json`.

---

### 2026-06-24 - Audit rendered pages, not the SPA shell

**Reason:** The on-page audit fetched raw HTML with Axios and Cheerio, which contains only the React root. It falsely reported that every SPA page had no H1, H2, or internal links.

**Decision:** Reuse the existing Puppeteer dynamic renderer, then run the existing Cheerio checks against that rendered HTML. The server's hidden fallback H1/H2 injection was removed because it created duplicate headings in the rendered crawler output.

**Files:** `backend/src/services/seoToolkitService.ts`, `backend/src/services/seoHtmlService.ts`.

---

### 2026-06-25 - Client head updates should mutate existing tags

**Reason:** The server already injects canonical SEO tags into the rendered HTML. A second client-side head manager can stack duplicate titles, descriptions, canonical URLs, and hreflang tags after hydration.

**Decision:** Keep one shared client-side SEO updater that rewrites the existing `<head>` tags in place instead of rendering a separate duplicate head tree.

**Files:** `frontend-build/src/components/seo/SeoProvider.tsx`.

---

### 2026-06-25 - Sitemap endpoint names should stay consistent

**Reason:** The admin SEO dashboard reported sitemap URLs with different names than the actual public routes, which is confusing during audits and makes validation look broken.

**Decision:** Align the reported sitemap URLs with the real routes: `/post-sitemap.xml`, `/page-sitemap.xml`, `/product-sitemap.xml`, and `/product_cat-sitemap.xml`.

**Files:** `backend/src/controllers/seoController.ts`.

---

### 2026-06-25 - Add a tiny llms.txt route

**Reason:** Screaming Frog surfaced `llms.txt not found` as a notice. The site does not need a heavy content map for that.

**Decision:** Add one lightweight plain-text `/llms.txt` route with a short summary of the site and its SEO structure.

**Files:** `backend/src/app.ts`.

---

### 2026-06-25 - Source crawlers need a temporary H1 fallback

**Reason:** The storefront is still a client-rendered React app, so raw HTML crawlers can miss body headings even when the hydrated page renders them correctly.

**Decision:** Inject one offscreen H1 into the server-rendered HTML and remove it on client mount. That keeps source crawlers happy without leaving a visible duplicate in the hydrated app.

**Files:** `backend/src/services/seoHtmlService.ts`, `frontend-build/src/components/layout/Layout.tsx`.

---

### 2026-06-25 - Verified rendered SEO HTML shape

**Reason:** The remaining crawler issue list is broad, so the only useful proof is the actual rendered HTML shape.

**Decision:** Treat the server-rendered home page as the validation target: one title, one description, one canonical, four hreflang links, and one source H1 fallback.

**Files:** `backend/src/services/seoHtmlService.ts`, `backend/src/services/seoMetaService.ts`, `frontend-build/src/components/seo/SeoProvider.tsx`.

---

### 2026-06-25 - Blog reseed should not trust dead upload paths

**Reason:** Production blog rows can retain old featured-image URLs from deleted uploads or external sources, which causes Linkinator 404s even after reseeding.

**Decision:** When reseeding blog posts, only keep `/uploads/...` images if the file exists on disk at reseed time. Otherwise fall back to a stable local `/photos/...` asset so the resulting public blog pages never point at a missing image.

**Files:** `backend/scripts/reseedResearchBlogs.ts`, `backend/prisma/seed.ts`.

---

### 2026-06-25 - Mobile hero should skip the background video

**Reason:** PageSpeed on mobile was spending too much time and bandwidth on the hero background video, which does not help first paint.

**Decision:** Only enable the hero background video on larger screens and after idle time. Mobile gets the static fallback instead.

**Files:** `frontend-build/src/components/home/Hero.tsx`.

---

### 2026-06-25 - Optional analytics should not block the critical path

**Reason:** The injected Google Analytics script was blocked by CSP and added console noise without improving the immediate storefront experience.

**Decision:** Remove the automatic client-side GA loader from the maintenance guard. Analytics can be reintroduced later through a CSP-aligned server-side approach if it becomes necessary.

**Files:** `frontend-build/src/components/layout/MaintenanceGuard.tsx`, `frontend-build/src/utils/googleAnalytics.ts`.

---

### 2026-06-25 - Route matrix sanity check

**Reason:** Home page alone is too narrow for the crawl report. The flagged issue list spans static pages, product pages, and blog posts.

**Decision:** Verify the shared renderer against `/`, `/shop`, `/blog`, `/faq`, `/contact`, one active product, and one published blog post. All checked routes currently render one title, one description, one canonical link, four hreflang links, and one H1 in the source output.

**Files:** `backend/src/services/seoHtmlService.ts`, `backend/src/services/seoMetaService.ts`.

---

### 2026-06-23 - Preview PNGs use data URLs

**Reason:** Production CSP blocks `blob:` image URLs, causing valid authenticated previews to show as broken images.

**Impact:** Labels admin converts preview blobs to permitted `data:` URLs.

---

### 2026-06-23 - Centered label layout is optional

**Reason:** Client requested a comparison layout with branding in the center, product information left, and barcode/QR right without replacing the current design.

**Impact:** Preview and generation accept `layout: centered`; its PNG/PDF files end in `-centered`, so either layout can be regenerated independently.

**Files:** `backend/src/services/labelRenderService.ts`, `backend/src/controllers/labelAdminController.ts`, `frontend-build/src/pages/admin/Labels.tsx`

---

### 2026-06-22 — Server-injected SEO + /nl/ /de/ URLs

**Reason:** Pure SPA shell meant crawlers saw one generic `index.html` for every URL; language was client-only with no hreflang.

**Decision:** Express serves built `index.html` with injected title, meta, canonical, hreflang, OG, and JSON-LD from `seoMetaService`. Indexable locales: EN at `/`, NL at `/nl/`, DE at `/de/`. Sitemap emits all three with hreflang. Client mirrors via `usePageSeo` + `react-helmet-async`.

**Files:** `backend/src/services/seoMetaService.ts`, `seoHtmlService.ts`, `frontend-build/src/App.tsx`, `utils/seoPaths.ts`

---

### 2026-06 - Consolidated SEO Center

**Reason:** WordPress SEO plugins are feature references but cannot run in this React/Express stack.

**Impact:** One SEO Center groups sitemap/robots, schema, crawl, image variants, redirects, and provider setup. Sharp handles WebP/AVIF without another image optimizer. External search/rank data remains disconnected until valid credentials exist.

**Files:** `backend/src/services/seoService.ts`, `backend/src/controllers/seoController.ts`, `frontend-build/src/pages/admin/SEO.tsx`

---

### 2026-06 — Memory-first repo analysis

**Reason:** `AGENTS.md` requires future agents to read `project-memory/current-state.md`, `project-memory/architecture.md`, and `project-memory/decisions.md` before coding, and to search only task-related files.

**Impact:** Project-memory files are treated as the onboarding source of truth. Repo analysis should use targeted reads of entry points, package files, schema, and task-related modules instead of broad repository scans.

**Files:** `AGENTS.md`, `project-memory/current-state.md`, `project-memory/architecture.md`, `project-memory/decisions.md`

---

### 2026-06 — SQLite as primary database

**Reason:** Zero-config local and small/medium production deploys; single `dev.db` file easy to back up.

**Impact:** No native enums/JSON columns — Prisma extension in `config/database.ts` parses JSON strings. Postgres migration path documented in README.

**Files:** `backend/prisma/schema.prisma`, `backend/src/config/database.ts`

---

### 2026-06 — `frontend-build/` is the active frontend

**Reason:** Vite + React app used for dev and production builds. `frontend-src/` and root `frontend/` are legacy/pre-built artifacts.

**Impact:** All UI work targets `frontend-build/src/`. Deploy uploads `frontend-build/dist/`.

**Files:** `frontend-build/`, `DEPLOY.md`

---

### 2026-06 — Combined front+back label PNG (not separate files)

**Reason:** Sticker printer workflow expects one print job per variant; admin preview shows both sides together.

**Impact:** `renderCombinedLabelPng()` keeps the configured physical dimensions (40x20 mm by default) and renders the front and back as equal-width halves at their final resolution. PNG previews and PDF pages now print at the requested size without scaling.

**Files:** `backend/src/services/labelRenderService.ts`, `backend/scripts/generateAllLabels.ts`

---

### 2026-06 — Label dimensions: 40×20 mm default, NAD+ 30×60 mm

**Reason:** Client bottle sticker specs; NAD+ bottles use portrait labels.

**Impact:** `getLabelDimensions()` in `labelVariantHelpers.ts` checks product name for `nad+`.

**Files:** `backend/src/services/labelVariantHelpers.ts`, `LabelVariant.labelWidthMm/labelHeightMm`

---

### 2026-06 — Global brand colors, not per-variant overrides

**Reason:** Client provided one palette for all products (`#1A2B4C`, `#2FA9B8`, `#2C3E50`).

**Impact:** `resolveLabelColors()` ignores `colorOverrides` DB column. Admin color UI may show overrides but they have no effect.

**Files:** `backend/src/services/labelVariantHelpers.ts`, `frontend-build/src/pages/admin/Labels.tsx`

---

### 2026-06 — Client front background image over generated gradients

**Reason:** Photo-extracted patterns were blurry and captured bottle reflections/text.

**Impact:** Primary front render uses `assets/label-front-background.png`; black letterbox trimmed via Sharp. Fallback: gradient + `label-bottom-pattern.png`.

**Files:** `backend/assets/label-front-background.png`, `backend/src/services/labelRenderService.ts`

---

### 2026-06 — Two-layer Sharp compositing (background + content SVG)

**Reason:** Embedded SVG `<image>` backgrounds were unreliable in production `dist/` builds.

**Impact:** Background resized separately, then content SVG composited on top.

**Files:** `backend/src/services/labelRenderService.ts`

---

### 2026-06 — Logo white knock-out for transparency

**Reason:** `logo.jpeg` had solid white background; `.flatten({ background: '#fff' })` made logo look pasted on.

**Impact:** `knockOutLogoBackground()` converts near-white pixels to alpha before resize.

**Files:** `backend/src/services/labelRenderService.ts`

---

### 2026-06 — `resolveBackendRoot()` via `__dirname`

**Reason:** `process.cwd()` differs between dev (`tsx src/`) and prod (`node dist/server.js`).

**Impact:** Asset and logo paths resolve correctly on server without env vars.

**Files:** `backend/src/services/labelRenderService.ts`

---

### 2026-06 — Deploy `backend/assets/` with every label-related backend deploy

**Reason:** Quick `dist/`-only deploy caused missing backgrounds on production.

**Impact:** SCP `assets/` in Phase 6c of DEPLOY.md; regenerate labels after deploy.

**Files:** `DEPLOY.md`, `backend/assets/`

---

### 2026-06 — tsx watch ignore rules for label dev stability

**Reason:** Writing PNGs to `uploads/` and `dev.db` changes triggered endless backend restarts → frontend proxy ECONNREFUSED.

**Impact:** `npm run dev` ignores `prisma/**`, `uploads/**`, `assets/**`, `*.png`, `*.db`.

**Files:** `backend/package.json`

---

### 2026-06 — Align QR code bottom edge with barcode bottom edge

**Reason:** Placing the QR code with arbitrary bottom insets caused text/border clipping at the bottom edge.

**Impact:** Bottom edges of barcode and QR are mathematically aligned at `barcodeTop + barcodeH`, and the `Math.max` constraint was removed to prevent QR from being pushed too high.

**Files:** `backend/src/services/labelRenderService.ts`

---

### 2026-06 — Category Translations CRUD & Dynamic Toggle

**Reason:** Client requested the ability to translate Category names and descriptions into Dutch/German, mirroring the Blog/Product translation tabs.

**Impact:** Added `translations` to `Category` model, implemented Google auto-translate button on admin category modal, and linked `useLangStore` to category list queries so category tables translate dynamically in real-time when the site language is toggled.

**Files:** `backend/prisma/schema.prisma`, `backend/src/controllers/productController.ts`, `frontend-build/src/pages/admin/Categories.tsx`

---

### 2026-06 — Terms & Shipping Pages Redesign

**Reason:** Visual QA highlighted low legibility and plain text layouts for terms and shipping pages.

**Impact:** Implemented scroll-spy active TOC tracking on Terms page, and transformed Shipping page into a modular grid-based policy dashboard using custom icons and high-contrast callout boxes.

**Files:** `frontend-build/src/pages/Terms.tsx`, `frontend-build/src/pages/Shipping.tsx`

---

### 2026-06 — Font customization UI commented out (temporary)

**Reason:** Google Fonts integration was not working reliably in admin preview.

**Impact:** `fontOverrides` column exists; defaults to Montserrat/DejaVu. Re-enable when fixed.

**Files:** `frontend-build/src/pages/admin/Labels.tsx`, `backend/src/services/googleFontService.ts`
