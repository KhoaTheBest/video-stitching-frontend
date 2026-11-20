# Monetization audit and plan

Repo state audited: `main` at aefb2d6. Live site: https://stitching.khoalt.dev

## Status (branch `feat/monetization-astryx`)

Decisions confirmed: codec option 1, freemium with licence keys and no accounts, Lemon Squeezy, the free limits in 2.2, and Vitest plus Astryx as new dependencies.

| Plan item | Status |
|---|---|
| 1. Lint fixes, Vitest, small bug fixes | Done |
| 2. Codec/licence decision | Done: FFmpeg.wasm removed entirely, export uses Mediabunny (MPL-2.0) and WebCodecs |
| 3. Astryx migration, Download button | Done |
| 4. Self-host the FFmpeg core | No longer needed: there is no FFmpeg core |
| 5. Entitlements, limits, watermark, paywall | Done |
| 6. Pricing and landing pages, SEO | Done (no pre-rendering yet) |
| 7. Licence validation and checkout links | Done in code; accounts and env vars are on you (see the PR checklist) |
| 8. Legal drafts | Done as drafts with placeholders; they need review |
| 9. Bring your own files | Done, plus in-panel segment editing |
| 10. Accessibility, responsive layout, error boundary, empty and error states | Mostly done through Astryx components; not checked with a screen reader |
| 11. Analytics | Not done: waiting for your choice of tool |
| 12. README, TASK_SUMMARY, licence report, npm audit | Done; repo `LICENSE` is waiting for your choice |

Correction to 2.7, option 1: keeping the FFmpeg core "only for trimming" would not have avoided the GPL. That build is GPL as a whole, whichever codec is called. So FFmpeg was removed completely instead.

Not verified: the browser end-to-end export. This machine can't start a headless browser (system libraries are missing and there is no sudo), so the export pipeline is covered by unit tests, type checks and a render smoke test only.

## 1. Current state (baseline, before any change)

| Check | Result |
|---|---|
| `npm ci` | OK, 18 vulnerabilities reported by `npm audit` (1 low, 5 moderate, 12 high). Not yet triaged. |
| `npm run build` (`tsc -b && vite build`) | PASS. Main JS is 237 kB (74 kB gzip). |
| `npm run lint` | FAIL: 3 `no-explicit-any` errors (`App.tsx:32`, `MainPlayer.tsx:119`, `SegmentPlayer.tsx:77`). |
| Tests | None exist. No `test` script and no test runner. |
| Run the app | Not run yet. It needs a browser and downloads about 30 MB of wasm. I'll run it in step 4. |

Already broken, found by reading the code:

- **README and TASK_SUMMARY.md describe MediaBunny, but the code uses FFmpeg.wasm.** Both documents are stale after the migration commit.
- **`public/vite.svg` and the page title are template leftovers.** The title is `app` and the favicon is Vite's.
- **Output is always forced to 1280x720.** A portrait ad cutdown is centre-cropped into a landscape frame.
- **A source with no audio stream crashes the stitch.** The filter graph always references `[i:a]`.
- **`MainPlayer` guards its effect with `processingRef`.** Under React StrictMode the second run is skipped and the first run's cleanup never cancels it. There is no abort or cancel.
- **Each `SegmentPlayer` loads its own FFmpeg instance.** That means a 30 MB wasm load and a full source download per segment, and the sources are not shared.
- **Blob URLs are never revoked.** Memory leaks on every re-run.
- **Errors use `alert()`.** Segment errors print the raw FFmpeg message.
- **CSS typo:** `ease-i-out` in `MainPlayer.tsx`.
- **FFmpeg core comes from `unpkg.com` at runtime.** It is a single point of failure and a supply-chain exposure, and it is not cached or versioned by us.
- **Production serves no COOP/COEP headers.** They are only set in `vite.config.ts` for the dev server. That is fine for the single-thread core in use, but the README claims they are required.
- **The sample data points to a third-party staging host** (`stg.trypncl.com`) that we don't control. The demo can break at any time and depends on its CORS settings.

## 2. Audit as a paid product

### 2.1 What the product actually is today

A JSON-driven demo. The user edits a "cutdown" JSON in Monaco and the app trims and concatenates remote video segments in the browser. There is no way to bring your own video. The audience for a JSON editor is developers, not people who pay for video tools.

To earn money it needs a normal-user flow: drop in video files, mark segments (in/out, mute), reorder, export. The JSON editor can stay as an "Advanced" tab. I won't remove it.

### 2.2 Monetization model (recommended)

**Freemium, client-side processing, one paid "Pro" tier sold as a subscription with a lifetime option.**

- **Why freemium:** the value is visible in 30 seconds with no sign-up. The export is the conversion point.
- **Why limits and not time-boxed trials:** processing runs on the user's machine, so our cost per export is about zero. Marginal cost is only hosting. That makes a cheap lifetime licence viable and keeps the free tier risk-free for us.
- **Proposed limits (all values are placeholders for you to set):**
  - Free: up to 5 segments, 720p, 60 s total output, a small watermark.
  - Pro: unlimited segments, up to 1080p, no watermark, longer outputs.
- **Proposed prices (placeholders only):** Pro monthly, Pro yearly, and a one-off lifetime licence. I will not hard-code amounts; they go in config and `.env.example`.
- **Enforcement caveat:** anything checked only in the browser can be bypassed. For a low-priced tool this is acceptable, but entitlement should be checked against a licence validation call, not a local flag (see 2.3).
- **Rejected options:**
  - Pure sponsorship: unlikely to produce meaningful income.
  - Usage-based credits: we have no per-use cost to pass on.
  - Server-side rendering as a paid tier: possible later, but it means running compute and storage, and it is a separate product.

### 2.3 What is missing to charge

| Need | Recommendation |
|---|---|
| Payments | **Lemon Squeezy** in test mode. It is a merchant of record, so it handles VAT and sales tax. That matters for a solo seller. Stripe is the alternative if you want lower fees and are willing to handle tax yourself. |
| Accounts | **Not needed in v1.** Sell a **licence key**: buyer gets a key by email and pastes it into the app. This avoids a user database, passwords and most privacy work. Add accounts only if you later want cross-device sync or cloud storage. |
| Entitlement check | A small **Cloudflare Worker** (or Pages Function) that validates the key against the Lemon Squeezy licence API and returns a signed, short-lived "pro" token. The app never sees the API secret. |
| Pricing page | New. Three plans, a comparison table, an FAQ, and clear refund wording. |
| Paywall and limits | A single `useEntitlements()` hook so limits are enforced in one place (segment count, resolution, duration, watermark). |
| Webhooks | Optional in v1. Licence keys validate on demand, so webhooks are only needed for subscription state and refunds. |
| Env vars | `VITE_LS_CHECKOUT_URL_*` (public), `LEMONSQUEEZY_API_KEY` and `ENTITLEMENT_SIGNING_SECRET` (Worker secrets only). All placeholders in `.env.example`. |

### 2.4 Landing page, value proposition, onboarding

- **Today there is no landing page.** The app opens straight into the JSON editor.
- **Value proposition (draft):** "Cut and stitch videos in your browser. Nothing is uploaded." Privacy is the strongest differentiator against cloud tools, and it is true here because processing is local. I would only claim it after confirming no source is uploaded anywhere.
- **Proposed structure:** hero with a demo, how it works in three steps, privacy, pricing, FAQ, footer with legal links.
- **Onboarding:** a "Try sample project" button that loads the bundled sample, then a prompt to add your own files.
- **Empty state:** no project loaded. **Error states:** CORS blocked, unsupported codec, out of memory, offline. Each needs a plain-language message and a next step.

### 2.5 Reliability, performance, accessibility, SEO, analytics

- **Reliability:**
  - Self-host the FFmpeg core instead of using `unpkg`.
  - Share one FFmpeg instance across the app.
  - Support cancel.
  - Revoke blob URLs.
  - Handle sources without audio.
  - Add an error boundary.
  - Use `SharedArrayBuffer` only if we adopt the multi-thread core, which then requires COOP/COEP on production.
- **Performance:**
  - A 30 MB wasm and Monaco (an extra download) both load eagerly. Lazy-load Monaco and only load FFmpeg when the user presses Export.
  - Memory: a 140 s 1080p source is read fully into the wasm heap. Large files can fail on low-memory devices. Set a documented size limit.
- **Accessibility:** the current UI uses inline styles with hard-coded colours and no labels or live regions. Progress needs `role="progressbar"`, errors need `role="alert"`, and the sample `select` needs a label. Astryx components should cover most of this.
- **SEO:** a real `<title>`, description, Open Graph tags, a canonical URL, `robots.txt`, `sitemap.xml`, and static HTML for the landing content (pre-render or SSG), since an SPA shell has nothing for crawlers.
- **Analytics:** privacy-friendly and cookieless (Plausible or Cloudflare Web Analytics), with events for upload, export started, export finished, paywall shown, checkout clicked. Not added without your choice of tool.

### 2.6 Legal

- **Terms of Service, Privacy Policy, Refund policy:** none exist. I can draft templates, but they need your review (ideally a lawyer's) before launch. I am not giving legal advice.
- **Cookie notice:** not needed if we use only cookieless analytics and no tracking cookies. Needed if we add anything else.
- **Licence of this repo:** README says MIT, but there is no `LICENSE` file. See the GPL point below, which may conflict.
- **Dependencies (direct):**
  - React: MIT.
  - Vite: MIT.
  - `@ffmpeg/ffmpeg` and `@ffmpeg/util`: MIT.
  - `@monaco-editor/react`: MIT.
  - **`@ffmpeg/core` (the wasm): GPL, see 2.7.**
  - Astryx core: MIT.
  - Not yet checked: the full transitive tree. I will run a licence report (e.g. `license-checker`) in step 4 and list it in the PR.
- **Codec patents:** H.264 and AAC are covered by patent pools. Selling software that includes encoders can create royalty obligations independent of copyright licences. This is a separate question from the GPL one. Get advice before charging.

### 2.7 FFmpeg.wasm: LGPL or GPL?

**It is GPL, not LGPL.** I downloaded `@ffmpeg/core@0.12.6` (the exact file `unpkg` serves to the app) and read its embedded build configuration. It contains `--enable-gpl --enable-libx264 --enable-libx265 ...` and the GPL licence text. The app also calls `-c:v libx264`, which is the GPL component.

What this means for selling it:

- Loading that wasm in users' browsers is **distribution** of a GPL-licensed binary. Obligations include giving users the licence text and the corresponding source for the GPL parts, and not adding restrictions.
- Whether our own app code becomes a derivative work is arguable. It talks to FFmpeg through a message-passing worker API and a command line, which is a weaker coupling. But I would not rely on that for a paid, closed-source product without legal advice.
- x264 is also sold under a separate commercial licence by its authors, which is the usual way to ship it in closed-source commercial software.
- The repo's MIT claim and a closed paywall are both hard to square with a bundled GPL binary.

Options, with my recommendation first:

1. **(Recommended) Stop using libx264 for the paid path.** Use the browser's WebCodecs encoder. This repo already used MediaBunny (MPL-2.0) before the FFmpeg migration. Keeping FFmpeg only for trimming and concat with `-c copy` or LGPL-only codecs avoids GPL.
2. **Build a custom LGPL-only `ffmpeg-core`** (no `--enable-gpl`, no x264/x265). This is real work: a custom emscripten build, and the LGPL then requires relinkability and notices. There is no LGPL H.264 encoder inside it either, so output encoding still needs another path.
3. **Keep the GPL core and comply fully:** publish our source under GPL-compatible terms, self-host the core with notices and a source offer. This conflicts with a closed paywall but not with selling a hosted service or support. It is the cheapest route and only suits an open-source product.
4. **Buy an x264 commercial licence.**

This one is your decision, and it changes the architecture. I will not start work that depends on it until you choose.

### 2.8 UI/UX review

Judged against the design skill checklists:

- **Hierarchy:** the page is a title and two dark panels. There is no primary action. "Execute" is the only call to action and it is a developer verb.
- **Layout:** fixed heights (750 px, 420 px) and `minWidth` 400/500 px force horizontal scroll on phones. No responsive design.
- **Visual system:** all styling is inline with raw hex colours and `px`, no tokens. This is exactly what the Astryx migration replaces.
- **Copy:** "MediaBunny Video Segments" is the title, but MediaBunny is no longer used.
- **Feedback:** progress is a thin bar inside the video frame, with no time estimate, no cancel, and no download button (only the video's own controls).
- **Missing:** a download button for the stitched file. This is the core paid action, so it must exist.
- **Segment grid:** six or more identical fixed-width cards with raw `Scene`, `Range`, `Status` text and emoji. Needs a proper timeline or list with clear selected and processing states.
- **Direction:** a calm editor workspace (Astryx `editor` template: source rail, preview canvas, inspector) fits better than a marketing-style gimmick. The landing page can sit in front of it.

## 3. Prioritised plan

Order is by dependency, then value. Each step is its own commit, with the build run after each.

**P0, before anything can be sold**
1. Branch `feat/monetization-astryx`. Fix the 3 lint errors and add a test runner (Vitest) with first tests for the filter-graph builder and the entitlement logic. Fix the small bugs in section 1 that don't change features (typo, blob revocation, no-audio handling, shared FFmpeg instance).
2. **Codec/licence decision (2.7)** and implementation of the chosen path. Blocked on you.
3. Astryx migration: scaffold from the `editor` template, replace inline styles with components and tokens, keep the JSON editor, project select, Format and Execute actions, per-segment previews and the stitched output. Add a Download button.
4. Self-host the FFmpeg core in `public/` (or drop it, depending on step 2) and remove the `unpkg` runtime dependency.

**P1, to take payment**
5. `useEntitlements()` plus free-tier limits and a watermark option, with a paywall dialog.
6. Pricing page and landing page (hero, how it works, privacy, FAQ), with SEO tags.
7. Cloudflare Worker for licence validation and Lemon Squeezy checkout links in test mode. `.env.example` with placeholders only. No live keys.
8. Legal pages as drafts: Terms, Privacy, Refunds. Clearly marked "draft, needs review".

**P2, polish**
9. "Bring your own files" input (file picker and drop zone) with size limits and clear errors.
10. Accessibility pass, responsive layout, error boundary, empty and error states.
11. Analytics (cookieless), after you pick the tool.
12. Update README and TASK_SUMMARY to match reality; add a `LICENSE` that matches the decision in 2.7; dependency licence report; `npm audit` triage.

## 4. What I need from you

- Choose the codec option in 2.7 (my recommendation is option 1).
- Confirm the model: freemium, licence keys, no accounts in v1, Lemon Squeezy.
- Confirm or change the free-tier limits in 2.2, and give the real prices later (the code will read them from config).
- Confirm that installing `vitest` and the Astryx packages as new dependencies is fine.
