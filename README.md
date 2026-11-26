# Stitcher (video-stitching-frontend)

Cut and stitch videos in the browser. Pick segments from one or more videos, preview each one, and export a single MP4. Decoding and encoding run on the user's device through WebCodecs, so videos are never uploaded.

Live: https://stitching.khoalt.dev

## Features

- **Bring your own videos.** Drop files into the editor; they stay in memory on the device. Projects can also reference videos by URL (the bundled samples do).
- **Segment editing.** Set start and end, mute, reorder or remove segments. An advanced JSON tab (Monaco) shows the same project as `video_cutdown_result` JSON and accepts edits.
- **Instant previews.** Each segment plays straight from its source with a media fragment, no re-encoding.
- **Export.** Segments are scaled and centre-cropped to the first source's aspect ratio, audio is resampled to 48 kHz stereo, and muted segments or silent sources get silence so audio and video stay in sync. Exports can be cancelled and downloaded.
- **Free and Pro plans.** Free: 5 segments, 60 s, 720p, watermark. Pro: no watermark, 1080p, unlimited segments, up to 30 minutes. Pro is unlocked with a Lemon Squeezy licence key; there are no accounts.

## Tech stack

- React 19, TypeScript, Vite
- [Astryx](https://github.com/meta/astryx) design system (`@astryxdesign/core`, neutral theme)
- [Mediabunny](https://github.com/Vanilagy/mediabunny) (MPL-2.0) on top of WebCodecs for demuxing, decoding, encoding and MP4 muxing
- Cloudflare Pages Function (`functions/api/license.ts`) for licence checks
- Vitest

The app used FFmpeg.wasm until this branch. The `@ffmpeg/core` build it loaded is compiled with `--enable-gpl --enable-libx264`, which would put the paid product under the GPL, so it was replaced. See `MONETIZATION_PLAN.md`, section 2.7.

## Getting started

Node 20+.

```bash
npm install
cp .env.example .env.local   # optional: prices and checkout links
npm run dev                  # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (app, node and functions) and build to `dist/` |
| `npm test` | Unit and render tests (Vitest) |
| `npm run lint` | ESLint |
| `npx astryx doctor --built .` | Checks the Astryx setup and that the UI uses Astryx components and tokens |

Licence activation calls `/api/license`, which only exists on Cloudflare Pages. To try it locally, build and run `npx wrangler pages dev dist` with `LEMONSQUEEZY_STORE_ID` and `LEMONSQUEEZY_PRODUCT_IDS` set. Without it, the editor works on the free plan.

## Configuration

All variables are documented in `.env.example`.

- `VITE_*` values are public and compiled into the bundle: display prices, Lemon Squeezy checkout links, the support email. A paid plan without a checkout link shows "Coming soon".
- `VITE_CF_ANALYTICS_TOKEN` turns on Cloudflare Web Analytics (cookieless page views). Empty means no analytics, and the privacy page says so.
- `LEMONSQUEEZY_STORE_ID` and `LEMONSQUEEZY_PRODUCT_IDS` are set in the Cloudflare Pages project. The licence function rejects keys from any other store or product. The Lemon Squeezy License API needs no API key.

Plan limits and the product name live in `src/config/plans.ts`.

## Layout

```
src/
  engine/       plan.ts (validation, limits, output size), stitch.ts (Mediabunny pipeline), edit.ts (project edits)
  licensing/    entitlements (pure) and useEntitlements (licence storage and revalidation)
  pages/        Landing, Workspace (editor), Pricing, Legal (drafts) and open-source notices
  components/   ExportPanel, SegmentPreview, SegmentEditor, JsonEditor, ProDialog, SiteChrome, ErrorBoundary
  router.ts     minimal client-side router, wired into Astryx links through RouterLink
functions/api/  Cloudflare Pages Function for licence keys
```

## Browser support

Export needs WebCodecs. It is developed against current desktop Chrome and Edge. The encoder picks the first codec the browser supports (H.264, then VP9, AV1, HEVC; AAC, then Opus), and the editor shows a clear message if none is available.

## Licence

No licence file has been chosen yet; see the checklist in the pull request. Third-party notices are at `/licenses` in the app.
