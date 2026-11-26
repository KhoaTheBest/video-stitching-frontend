import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  UrlSource,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import type { StitchPlan } from './plan';

/**
 * Stitches the planned segments into one MP4, entirely in the browser.
 *
 * Decoding and encoding use the browser's WebCodecs implementation through
 * Mediabunny (MPL-2.0). No GPL code (x264, FFmpeg's GPL build) is shipped.
 * Every segment is scaled and centre-cropped to the plan's frame, and its audio
 * is resampled to 48 kHz stereo. Muted segments, and sources without audio, get
 * silence so audio and video stay in sync.
 */

export const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const FRAME_RATE = 30;
/** Audio is mixed in windows of this length to bound memory use. */
const AUDIO_WINDOW_SEC = 20;

export type StitchErrorCode = 'unsupported-browser' | 'network' | 'decode' | 'aborted';

export class StitchError extends Error {
  readonly code: StitchErrorCode;
  constructor(code: StitchErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface StitchOptions {
  /** Local files picked by the user, by `source_id`. Others are fetched from their URL. */
  files?: ReadonlyMap<number, Blob>;
  /** Drawn in the bottom-right corner of every frame when set. */
  watermark?: string;
  signal?: AbortSignal;
  onProgress?: (fraction: number, label: string) => void;
  /** Non-fatal problems, such as a segment running past the end of its source. */
  onWarning?: (message: string) => void;
}

export interface StitchResult {
  blob: Blob;
  videoCodec: string;
  audioCodec: string | null;
}

export function isStitchingSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

export async function stitch(plan: StitchPlan, options: StitchOptions = {}): Promise<StitchResult> {
  const { files, watermark, signal, onProgress, onWarning } = options;
  const report = (fraction: number, label: string) => onProgress?.(Math.min(1, Math.max(0, fraction)), label);
  const throwIfAborted = () => {
    if (signal?.aborted) throw new StitchError('aborted', 'Export cancelled.');
  };

  if (!isStitchingSupported()) {
    throw new StitchError('unsupported-browser', 'This browser cannot encode video. Use a recent Chrome, Edge, Safari or Firefox.');
  }

  const { width, height } = plan;
  const format = new Mp4OutputFormat({ fastStart: 'in-memory' });
  const videoCodec = await getFirstEncodableVideoCodec(
    format.getSupportedVideoCodecs().filter((c) => ['avc', 'vp9', 'av1', 'hevc'].includes(c)),
    { width, height, frameRate: FRAME_RATE },
  );
  if (!videoCodec) {
    throw new StitchError('unsupported-browser', `This browser cannot encode ${width}x${height} video. Try a lower resolution or another browser.`);
  }
  const audioCodec = await getFirstEncodableAudioCodec(
    format.getSupportedAudioCodecs().filter((c) => c === 'aac' || c === 'opus'),
    { numberOfChannels: CHANNELS, sampleRate: SAMPLE_RATE },
  );
  if (!audioCodec) onWarning?.('This browser cannot encode audio, so the export is silent.');

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new StitchError('unsupported-browser', 'Canvas 2D is not available.');

  const output = new Output({ format, target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: FRAME_RATE });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, bitrate: QUALITY_HIGH }) : null;
  if (audioSource) output.addAudioTrack(audioSource);

  const inputs = new Map<number, Input>();
  const getInput = (sourceId: number, url: string) => {
    let input = inputs.get(sourceId);
    if (!input) {
      const file = files?.get(sourceId);
      input = new Input({ source: file ? new BlobSource(file) : new UrlSource(url), formats: ALL_FORMATS });
      inputs.set(sourceId, input);
    }
    return input;
  };

  try {
    await output.start();
    let audioWritten = 0;

    for (const [index, item] of plan.items.entries()) {
      throwIfAborted();
      const label = `Segment ${index + 1} of ${plan.items.length}`;
      report(item.outputStartSec / plan.totalSec, label);

      const input = getInput(item.source.source_id, item.source.url);
      const videoTrack = await withNetworkErrors(() => input.getPrimaryVideoTrack(), item.source.url);
      if (!videoTrack || !(await videoTrack.canDecode())) {
        throw new StitchError('decode', `${label}: this browser cannot decode the video in source ${item.source.source_id}.`);
      }

      const sourceEnd = await input.computeDuration();
      if (item.startSec >= sourceEnd) {
        onWarning?.(`${label} starts after its source ends (${sourceEnd.toFixed(1)} s), so it is filled with black.`);
      } else if (item.endSec > sourceEnd) {
        onWarning?.(`${label} runs past the end of its source; the rest is filled with the last frame.`);
      }

      // Video: draw each decoded frame into the output canvas at its new timestamp.
      const sink = new CanvasSink(videoTrack, { width, height, fit: 'cover', poolSize: 2 });
      let drawnUntil = 0; // seconds of this segment already covered
      for await (const frame of sink.canvases(item.startSec, Math.min(item.endSec, sourceEnd))) {
        throwIfAborted();
        const from = Math.max(frame.timestamp, item.startSec) - item.startSec;
        const to = Math.min(frame.timestamp + frame.duration, item.endSec) - item.startSec;
        if (to <= from) continue;
        drawFrame(ctx, frame.canvas, width, height, watermark);
        await videoSource.add(item.outputStartSec + from, to - from);
        drawnUntil = to;
        report((item.outputStartSec + to) / plan.totalSec, label);
      }
      if (drawnUntil < item.durationSec) {
        // Hold the last frame (or black) so the segment keeps its planned length.
        if (drawnUntil === 0) drawFrame(ctx, null, width, height, watermark);
        await videoSource.add(item.outputStartSec + drawnUntil, item.durationSec - drawnUntil);
      }

      // Audio: exactly `durationSec` of 48 kHz stereo per segment.
      if (audioSource) {
        const audioTrack = item.segment.muted ? null : await input.getPrimaryAudioTrack();
        const canDecodeAudio = audioTrack ? await audioTrack.canDecode() : false;
        if (audioTrack && !canDecodeAudio) onWarning?.(`${label}: audio cannot be decoded, so it is silent.`);
        const audioSink = audioTrack && canDecodeAudio ? new AudioBufferSink(audioTrack) : null;

        for (let w = 0; w < item.durationSec; w += AUDIO_WINDOW_SEC) {
          throwIfAborted();
          const windowSec = Math.min(AUDIO_WINDOW_SEC, item.durationSec - w);
          const frames = Math.round((item.outputStartSec + w + windowSec) * SAMPLE_RATE) - audioWritten;
          if (frames <= 0) continue;
          const buffer = audioSink
            ? await mixWindow(audioSink, item.startSec + w, frames)
            : new AudioBuffer({ length: frames, numberOfChannels: CHANNELS, sampleRate: SAMPLE_RATE });
          await audioSource.add(buffer);
          audioWritten += frames;
        }
      }
    }

    throwIfAborted();
    report(1, 'Finishing file');
    await output.finalize();
    const data = (output.target as BufferTarget).buffer;
    if (!data) throw new StitchError('decode', 'The encoder produced no output.');
    return { blob: new Blob([data], { type: format.mimeType }), videoCodec, audioCodec };
  } catch (err) {
    if (output.state === 'started' || output.state === 'pending') await output.cancel().catch(() => {});
    throw err;
  } finally {
    for (const input of inputs.values()) input.dispose();
  }
}

function drawFrame(
  ctx: OffscreenCanvasRenderingContext2D,
  frame: CanvasImageSource | null,
  width: number,
  height: number,
  watermark?: string,
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  if (frame) ctx.drawImage(frame, 0, 0, width, height);
  if (!watermark) return;
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.035));
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillText(watermark, width - size + 1, height - size + 1);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(watermark, width - size, height - size);
}

/** Renders `frames` samples of source audio starting at `startSec`, resampled to 48 kHz stereo. */
async function mixWindow(sink: AudioBufferSink, startSec: number, frames: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext({ numberOfChannels: CHANNELS, length: frames, sampleRate: SAMPLE_RATE });
  const endSec = startSec + frames / SAMPLE_RATE;
  for await (const { buffer, timestamp } of sink.buffers(startSec, endSec)) {
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(ctx.destination);
    const when = timestamp - startSec;
    if (when >= 0) node.start(when);
    else node.start(0, -when);
  }
  return ctx.startRendering();
}

async function withNetworkErrors<T>(fn: () => Promise<T>, url: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof TypeError || /fetch|network|status/i.test(String((err as Error)?.message))) {
      throw new StitchError('network', `Could not download ${url}. The server may be down or may not allow access from this site (CORS).`);
    }
    throw new StitchError('decode', `Could not read ${url}: ${(err as Error).message}`);
  }
}
