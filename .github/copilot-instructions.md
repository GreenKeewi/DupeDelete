# Copilot Instructions for DupeDelete

These rules help AI coding agents work productively in this repo. Keep it concise, specific, and aligned with the project’s current patterns.

## Tech + Architecture

- Next.js App Router (TypeScript). UI in `src/components` using shadcn/ui over Radix + Tailwind.
- Auth/session via Supabase client on the client side: `src/components/SessionContextProvider.tsx` exposes `useSession()`.
- Billing via Stripe: checkout (`src/app/api/checkout/route.ts`), webhook (`src/app/api/stripe-webhook/route.ts`), cancel (`src/app/api/cancel-subscription/route.ts`). Subscription state lives in Supabase `subscriptions` table, surfaced in `src/hooks/use-subscription.tsx`.
- Core feature: folder upload → server-side unzip/scan → preview/compare → download cleaned ZIP.
  - Upload: `src/app/api/upload/route.ts` uses `unzipper`, temp dirs from `src/lib/file-utils.ts`, and `scanFilesForDuplicates` in `src/lib/duplicate-detection.ts`.
  - Duplicate detection: MD5 for exact, perceptual pHash (image-hash) with Hamming distance, then SSIM fallback (`ssim.js` + `jimp`). Return groups with `detectionMethod`.
  - Preview: `src/app/api/preview/route.ts` serves files from temp dir by `jobId` + `relativePath`.
  - Download: `src/app/api/download/route.ts` zips kept files, then cleans the temp dir.
- Dashboard routes in `src/app/dashboard/**` gate on `useSession()` and redirect unauth users to `/login?redirect_to=...`.

## Local Dev & Build

- Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.
- Node Next.js 15, React 19. Tailwind configured in `tailwind.config.ts` and global styles `src/app/globals.css`.
- Webpack plugin (dev only) tags components; server build copies `@cwasm/webp/webp.wasm` for dependencies (`next.config.ts`). If you add server code using WebP, ensure paths align with `CopyWebpackPlugin`.

## Data Flow: Cleanup Feature

- Client (`src/app/cleanup/page.tsx`):
  - Zips selected directory client-side with JSZip, posts to `/api/upload`.
  - Receives `{ jobId, duplicateGroups, allScannedFiles }`. It rewrites image `fullPath` to `/api/preview?...` for display.
  - Comparison UI uses `DuplicateComparisonDialog`. Keep `ScannedFile` shape from `src/lib/duplicate-detection.ts`.
  - Download flow posts `{ jobId, filesToKeep: string[] }` to `/api/download`.
- Server (`/api/upload`):
  - Enforces 100-file limit for free tier; returns 403 with `{message, redirect}`.
  - Stores temp data under OS tmp (`os.tmpdir()/dupe-delete-temp/<job-id>`); keep the folder until download completes.

## Conventions

- Prefer shadcn in `src/components/ui/**`; compose custom components in `src/components/**` with Tailwind utilities. No CSS-in-JS.
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`.
- Toasts via `sonner`.
- Types: strong TypeScript; rely on `ScannedFile`, `DuplicateGroup` types. Extend types instead of `any`.
- API routes are Route Handlers returning `NextResponse`. For Stripe webhooks, keep raw body parsing disabled and verify signatures using the configured secret.
- Auth on client via `SessionContextProvider`. Protect dashboard pages by redirecting unauthenticated users.

## External Integrations

- Supabase: client is pre-configured in `src/integrations/supabase/client.ts` (generated). Use this for client-side reads/writes. Server-side admin operations (webhook/cancel) use `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
- Stripe: env vars required — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_*_PRICE_ID`s. Checkout uses `NEXT_PUBLIC_BASE_URL` for success/cancel URLs.
- Billing UI: `use-checkout` stores `pendingCheckoutPlan` and `pendingCheckoutInterval` in `localStorage` when redirecting unauthenticated users to login; `dashboard/pricing/page.tsx` resumes checkout post-login.

## Env & Temp Files

- Temp directories: see `src/lib/file-utils.ts`. Use `createTempDir`, `getTempFilePath`, `cleanupTempDir`. Respect `jobId` naming and keep relative paths stable.
- Preview/download assemble full paths using `jobId + '-extracted-'` and the file's `relativePath`. Be careful to URL-encode `relativePath` when building preview URLs.

## When Adding Features

- Duplicate detection: if adding methods, append after MD5/pHash/SSIM passes and set `detectionMethod` so UI can label it.
- Upload limits/plan checks: enforce in `/api/upload` (403 + redirect) consistent with `dashboard/pricing` flows.
- New dashboard pages: wrap in `SessionContextProvider` (already in `dashboard/layout.tsx`) and redirect in page-level client component if no user.
- API ergonomics: Keep responses JSON-serializable and aligned to existing shapes used by cleanup UI.

## Examples

- Protecting a page: see `src/app/dashboard/cleanup/page.tsx`.
- Starting checkout from UI: `src/components/PricingSection.tsx` + `src/hooks/use-checkout.tsx`.
- Stripe webhook to Supabase upsert: `src/app/api/stripe-webhook/route.ts`.
- File scanning pipeline: `src/app/api/upload/route.ts` -> `src/lib/duplicate-detection.ts`.

If something’s unclear (e.g., missing env var, planned behavior), leave a concise TODO with your assumption and proceed. Keep changes minimal and aligned with these patterns.
