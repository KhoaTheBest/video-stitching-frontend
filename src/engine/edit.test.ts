import { describe, expect, it } from 'vitest';
import { addVideos, emptyProject, moveSegment, removeSegment, updateSegment } from './edit';
import { planStitch } from './plan';

const video = (name: string, durationSec = 30) => ({ name, width: 1080, height: 1920, durationSec });

describe('addVideos', () => {
  it('adds a source and a default clip per video, with fresh ids', () => {
    const { project, sourceIds } = addVideos(emptyProject(), [video('a.mp4'), video('b.mov', 4)]);
    expect(sourceIds).toEqual([0, 1]);
    expect(project.source_files.map((s) => s.url)).toEqual(['local:a.mp4', 'local:b.mov']);
    expect(project.segments.map((s) => [s.source_id, s.start_ms, s.end_ms, s.purpose])).toEqual([
      [0, 0, 10_000, 'a'],
      [1, 0, 4_000, 'b'],
    ]);
    expect(project.total_duration_sec).toBe(14);

    const again = addVideos(project, [video('c.mp4')]);
    expect(again.sourceIds).toEqual([2]);
    expect(again.project.segments.at(-1)?.scene_id).toBe(2);
  });

  it('produces a project the planner accepts, keeping portrait output', () => {
    const { project } = addVideos(emptyProject(), [video('a.mp4')]);
    const plan = planStitch(project, { maxSegments: 5, maxOutputSeconds: 60, maxShortSide: 720 });
    expect([plan.width, plan.height]).toEqual([720, 1280]);
  });
});

describe('segment edits', () => {
  const base = addVideos(emptyProject(), [video('a.mp4'), video('b.mp4'), video('c.mp4')]).project;

  it('updates times and mute, keeping duration and totals in step', () => {
    const p = updateSegment(base, 1, { start_ms: 2_000, end_ms: 5_000, muted: true });
    expect(p.segments[1]).toMatchObject({ start_ms: 2_000, end_ms: 5_000, duration_sec: 3, muted: true });
    expect(p.total_duration_sec).toBe(23);
  });

  it('moves within bounds and removes', () => {
    expect(moveSegment(base, 0, 1).segments.map((s) => s.purpose)).toEqual(['b', 'a', 'c']);
    expect(moveSegment(base, 0, -1)).toBe(base);
    expect(removeSegment(base, 1).segments.map((s) => s.purpose)).toEqual(['a', 'c']);
  });
});
