# Giftmas — UK Christmas gift guides

Astro static site. Two pages only in this phase: `/secret-santa` (£10–£15 Secret Santa) and `/gifts-for-girlfriend` (skincare/beauty lead). No Amazon API of any kind — plain amazon.co.uk URLs with `?tag=giftmas00-21`.

## Local dev

```bash
cd N:\projects\Giftmas
npm install
npm run dev
```

Open http://localhost:4321/secret-santa and http://localhost:4321/gifts-for-girlfriend.

Build locally:

```bash
npm run build
npm run preview
```

Build output goes to `dist/`.

## Deploy to Cloudflare Pages (Git integration)

1. Push this repo to GitHub/GitLab.
2. Cloudflare Dashboard → Pages → Create project → Connect to Git → select the repo.
3. Build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: (leave blank)
4. Environment variables (Settings → Environment variables): set `MODEL_API_KEY` (and optional `MODEL_BASE_URL`, `MODEL_MODEL`). Never put the key in client code.
5. Deploy. The function at `functions/api/recommend.js` becomes `/api/recommend`.
6. Custom domain: Settings → Custom domains → add `giftmas.uk`. Cloudflare provisions SSL. Do not use a `*.pages.dev` URL as the primary URL.

## AI endpoint

Cloudflare Pages Function at `functions/api/recommend.js`. Reads the model key from `context.env.MODEL_API_KEY`. Falls back to a local rule-based parser when unset.

## Where to paste the real affiliate links

Replace each `PLACEHOLDER_LINK` with a real amazon.co.uk product URL ending in `?tag=giftmas00-21`.

- `src/pages/secret-santa.astro` — lines 18, 25, 32 (`href="PLACEHOLDER_LINK"`)
- `src/pages/gifts-for-girlfriend.astro` — lines 18, 25, 32 (`href="PLACEHOLDER_LINK"`)

AI-generated cards render `PLACEHOLDER_LINK` as the slot; curate winners into the static picks above.

## Search URLs for finding real products

See `amazon-search-urls.md` (12 plain amazon.co.uk search URLs, all tagged).

## Mobile breakpoints tested

CSS is mobile-first and fluid (clamp for type and spacing). Reviewed at 320px, 375px, 390px, 768px, 1024px, 1440px. Tap targets minimum 44×44px. Input box and result cards usable one-handed on a phone.

## Checklist before any Amazon API work is reconsidered

- [ ] Sale 1 — date: ____  order ref: ____  ASIN: ____  commission received: ____
- [ ] Sale 2 — date: ____  order ref: ____  ASIN: ____  commission received: ____
- [ ] Sale 3 — date: ____  order ref: ____  ASIN: ____  commission received: ____

Until all three are ticked: plain amazon.co.uk links with `?tag=giftmas00-21` only. No AWS keys, no OAuth, no API calls, no scraping.
