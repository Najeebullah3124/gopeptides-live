# GoPeptides — live server code

Snapshot of what runs on the production server (`212.227.70.189`) for gopeptides.nl, gopeptides.eu, gopeptides.de and gopeptides.be, taken on 15 October 2026.

> Secrets and customer data are **not** in this repository. Copy `backend/.env.example` to `backend/.env` and fill in the values; the database (`backend/prisma/dev.db`) is created with `npx prisma migrate deploy` + `npm run prisma:seed` (set `ADMIN_PASSWORD` first). End-to-end tests read the admin password from `E2E_ADMIN_PASSWORD`.

## Layout

| Folder | What it is | Server location |
|---|---|---|
| `backend/` | Node/TypeScript API + server-side SEO rendering (Express, Prisma, SQLite), with product images in `uploads/`. | `/var/www/html/backend` (pm2 process `nexipep-backend`) |
| `frontend/` | React/Vite **source code** of the shop and admin. | — (built locally, output copied to the server) |
| `frontend-live-build/` | The compiled frontend currently served (reference only). | `/var/www/html/frontend` |
| `server-config/nginx-default.conf` | nginx config for all four domains. | `/etc/nginx/sites-enabled/default` |

## Where the frontend source came from

The server only had the compiled frontend, and the previous repo (`MHarrisTariq/Nexipep-Ecommerce`, last commit 13 July) had an older copy of the source. `frontend/` was rebuilt as follows:

1. Base: `frontend-build/` from the old repo (config, `public/`, tests, type files, `index.css`).
2. All 145 source files of the live 18 August build, recovered from the build's source maps (`sourcesContent`).
3. Edits that were later made directly in the compiled files on the server, ported back into the source:
   - Product page: description headings and inline links (`descriptionLinked`), per-language SEO title/description/H1.
   - Orders: `shippingAddress` may arrive as a JSON string (account order detail, admin orders); admin order modal shows the shipping address.
   - Order confirmation: Google Ads conversion event (once per order).
   - gopeptides.eu defaults to English; the language switcher carries GA4's `_gl` linker across domains.
   - Google Ads tag config and Consent Mode `update` on cookie accept.
   - Checkout payment texts: the ecomtrade24 method is crypto only.
   - Shipping (30 Sep 2026): NL/BE €4.95 below €50, rest of Europe €7.95 below €150, free express from €450 outside NL and BE (`src/utils/shipping.ts`, `src/utils/expressEu.ts`), plus the matching texts.

`npm run build` (type-check + Vite) passes. The output is functionally the live site but not byte-identical, because the old lock file pinned different dependency versions.

## Shipping rules — keep in sync

| | Backend (what is charged) | Frontend (what is shown) |
|---|---|---|
| Standard shipping | `backend/src/controllers/orderController.ts` (`shippingFeeFor`, `freeShippingThresholdFor`) | `frontend/src/utils/shipping.ts` |
| Express EU | `backend/src/config/expressEu.ts` | `frontend/src/utils/expressEu.ts` |

## Deploying

Backend (on the server, in `/var/www/html/backend`):

```bash
npm install
npm run build              # tsc + prisma generate
pm2 restart nexipep-backend
curl -s http://localhost:3001/health
```

Frontend (locally):

```bash
cd frontend
npm install
npm run build              # output in frontend/dist
```

Then copy `frontend/dist/` to `/var/www/html/frontend/` on the server. The backend renders pages from `frontend/index.html`, so no restart is needed. A fresh build produces new hashed file names, so the per-file `no-cache` rules in nginx (added for bundles that were edited in place) are no longer needed afterwards.

Backups made during changes are kept in `/root` on the server (`*.bak-<date>-<reason>`).
