import type { Segment, SourceFile, VideoCutdownResult } from '../types';

/** Pure edits on a project; the UI keeps the result as its new state. */

export interface LocalVideoMeta {
  name: string;
  width: number;
  height: number;
  durationSec: number;
}

/** Placeholder URL recorded in the JSON for a file that only exists in this browser session. */
export const localUrl = (name: string) => `local:${name}`;

/** Clip length given to a newly added video. */
export const DEFAULT_CLIP_SEC = 10;

export function emptyProject(): VideoCutdownResult {
  return { project_name: 'My project', total_duration_sec: 0, source_files: [], segments: [] } as unknown as VideoCutdownResult;
}

/**
 * Adds each video as a source plus one segment covering its first seconds.
 * Returns the new project and the source id given to each video, in order.
 */
export function addVideos(project: VideoCutdownResult, videos: LocalVideoMeta[]): { project: VideoCutdownResult; sourceIds: number[] } {
  let nextSource = Math.max(-1, ...project.source_files.map((s) => s.source_id)) + 1;
  let nextScene = Math.max(-1, ...project.segments.map((s) => s.scene_id)) + 1;
  const sources: SourceFile[] = [];
  const segments: Segment[] = [];

  for (const v of videos) {
    const sourceId = nextSource++;
    const durationSec = Number.isFinite(v.durationSec) && v.durationSec > 0 ? v.durationSec : DEFAULT_CLIP_SEC;
    const end = Math.min(DEFAULT_CLIP_SEC, durationSec);
    sources.push({
      source_id: sourceId,
      asset_id: '',
      url: localUrl(v.name),
      duration_sec: durationSec,
      duration_ms: durationSec * 1000,
      fps: 0,
      dimension: { width: v.width, height: v.height },
    });
    segments.push({
      scene_id: nextScene++,
      source_id: sourceId,
      purpose: v.name.replace(/\.[^.]+$/, ''),
      timecode: '',
      start_ms: 0,
      end_ms: Math.round(end * 1000),
      summary: '',
      duration_sec: end,
      muted: false,
    });
  }

  return {
    project: withTotals({ ...project, source_files: [...project.source_files, ...sources], segments: [...project.segments, ...segments] }),
    sourceIds: sources.map((s) => s.source_id),
  };
}

export function updateSegment(project: VideoCutdownResult, index: number, patch: Partial<Pick<Segment, 'start_ms' | 'end_ms' | 'muted'>>) {
  const segments = project.segments.map((s, i) => {
    if (i !== index) return s;
    const next = { ...s, ...patch };
    return { ...next, duration_sec: Math.max(0, next.end_ms - next.start_ms) / 1000 };
  });
  return withTotals({ ...project, segments });
}

export function moveSegment(project: VideoCutdownResult, index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= project.segments.length) return project;
  const segments = [...project.segments];
  [segments[index], segments[target]] = [segments[target], segments[index]];
  return { ...project, segments };
}

export function removeSegment(project: VideoCutdownResult, index: number) {
  return withTotals({ ...project, segments: project.segments.filter((_, i) => i !== index) });
}

function withTotals(project: VideoCutdownResult): VideoCutdownResult {
  const total = project.segments.reduce((sum, s) => sum + Math.max(0, s.end_ms - s.start_ms) / 1000, 0);
  return { ...project, total_duration_sec: Math.round(total * 1000) / 1000, total_scenes: project.segments.length };
}
