# Task summary

What the app does and how the pieces fit, for whoever picks this up next. The README covers setup.

## Data model

A project is a `video_cutdown_result` (see `src/types.ts`): `source_files` (id, URL, dimensions) and an ordered list of `segments` (source id, `start_ms`, `end_ms`, `muted`). The bundled samples in `src/data/video_cutdown_results.json` use this shape, and so does the JSON tab. Videos picked from disk are recorded as `local:<file name>` and kept in memory for the session only.

## Export pipeline (`src/engine`)

1. `parseProject` validates the JSON fields the stitcher needs.
2. `planStitch` resolves sources, lays segments end to end, picks the output frame and reports limit violations. The frame keeps the first source's aspect ratio, caps the short side by plan, and uses even sizes.
3. `stitch` (Mediabunny, loaded on first export):
   - picks the first encodable video codec (`avc`, `vp9`, `av1`, `hevc`) and audio codec (`aac`, `opus`) for MP4
   - for each segment, decodes frames with `CanvasSink` (`fit: 'cover'` does the scale and centre-crop), draws the watermark on free exports, and adds frames to a `CanvasSource` at their new timestamps
   - holds the last frame if a segment runs past its source's end
   - mixes audio in 20-second windows through `OfflineAudioContext` (resampling to 48 kHz stereo), writing exactly the segment's length; muted segments and silent sources get silence
   - supports `AbortSignal`, progress and non-fatal warnings

Segment previews do not use the pipeline: they play the source with a `#t=start,end` media fragment.

## Plans and licensing

`src/config/plans.ts` holds the limits. `useEntitlements` reads the stored licence: Pro needs a server validation within the last 30 days, and the key is re-checked weekly. `functions/api/license.ts` proxies the Lemon Squeezy License API and only accepts this store's product ids.

## History

The first version used Mediabunny's lower-level sinks. A later commit switched to FFmpeg.wasm, which turned out to be a GPL build (x264). This branch returned to Mediabunny and WebCodecs so the product can be sold without GPL obligations.
