import type { Segment, SourceFile, VideoCutdownResult } from '../types';

/** Limits applied to one export. `Infinity` means unlimited. */
export interface ExportLimits {
  maxSegments: number;
  maxOutputSeconds: number;
  /** Cap on the shorter side of the output frame, in pixels (720 = 720p). */
  maxShortSide: number;
}

export interface PlannedSegment {
  segment: Segment;
  source: SourceFile;
  startSec: number;
  endSec: number;
  durationSec: number;
  /** Where this segment starts in the stitched output, in seconds. */
  outputStartSec: number;
}

export type LimitViolation =
  | { kind: 'segments'; actual: number; limit: number }
  | { kind: 'duration'; actual: number; limit: number };

export interface StitchPlan {
  items: PlannedSegment[];
  totalSec: number;
  width: number;
  height: number;
  violations: LimitViolation[];
}

export class PlanError extends Error {}

/**
 * Output frame: keep the aspect ratio of the first segment's source and cap the
 * shorter side. Dimensions are rounded down to even numbers, which H.264 requires.
 */
export function outputSize(
  source: { width: number; height: number },
  maxShortSide: number,
): { width: number; height: number } {
  const shortSide = Math.min(source.width, source.height);
  const scale = Math.min(1, maxShortSide / shortSide);
  const even = (n: number) => Math.max(2, Math.floor((n * scale) / 2) * 2);
  return { width: even(source.width), height: even(source.height) };
}

export function planStitch(project: VideoCutdownResult, limits: ExportLimits): StitchPlan {
  const { segments, source_files } = project;
  if (segments.length === 0) throw new PlanError('Add at least one segment to export.');

  let cursor = 0;
  const items = segments.map((segment) => {
    const source = source_files.find((s) => s.source_id === segment.source_id);
    if (!source) {
      throw new PlanError(`Segment ${segment.scene_id} points to source ${segment.source_id}, which does not exist.`);
    }
    const startSec = segment.start_ms / 1000;
    const endSec = segment.end_ms / 1000;
    if (!(endSec > startSec)) {
      throw new PlanError(`Segment ${segment.scene_id} must end after it starts.`);
    }
    const item = { segment, source, startSec, endSec, durationSec: endSec - startSec, outputStartSec: cursor };
    cursor += item.durationSec;
    return item;
  });

  const violations: LimitViolation[] = [];
  if (items.length > limits.maxSegments) {
    violations.push({ kind: 'segments', actual: items.length, limit: limits.maxSegments });
  }
  if (cursor > limits.maxOutputSeconds) {
    violations.push({ kind: 'duration', actual: cursor, limit: limits.maxOutputSeconds });
  }

  return { items, totalSec: cursor, ...outputSize(items[0].source.dimension, limits.maxShortSide), violations };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Validates the editor JSON. Accepts either `{ video_cutdown_result: {...} }` or the
 * inner object, and checks only the fields the stitcher relies on.
 */
export function parseProject(json: string): VideoCutdownResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new PlanError(`The JSON is not valid: ${(e as Error).message}`);
  }
  const project = isObject(raw) && isObject(raw.video_cutdown_result) ? raw.video_cutdown_result : raw;
  if (!isObject(project)) throw new PlanError('Expected a project object.');
  if (!Array.isArray(project.source_files)) throw new PlanError('`source_files` must be a list.');
  if (!Array.isArray(project.segments)) throw new PlanError('`segments` must be a list.');

  project.source_files.forEach((s: unknown, i) => {
    if (!isObject(s) || !isNum(s.source_id) || typeof s.url !== 'string' || !isObject(s.dimension)
      || !isNum(s.dimension.width) || !isNum(s.dimension.height)) {
      throw new PlanError(`source_files[${i}] needs source_id, url and dimension.width/height.`);
    }
  });
  project.segments.forEach((s: unknown, i) => {
    if (!isObject(s) || !isNum(s.scene_id) || !isNum(s.source_id) || !isNum(s.start_ms) || !isNum(s.end_ms)) {
      throw new PlanError(`segments[${i}] needs scene_id, source_id, start_ms and end_ms.`);
    }
  });
  return project as unknown as VideoCutdownResult;
}
