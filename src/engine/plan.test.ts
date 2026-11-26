import { describe, expect, it } from 'vitest';
import { outputSize, parseProject, planStitch, PlanError } from './plan';
import samples from '../data/video_cutdown_results.json';
import type { SampleData, VideoCutdownResult } from '../types';

const unlimited = { maxSegments: Infinity, maxOutputSeconds: Infinity, maxShortSide: 1080 };

const project = (segments: Array<[number, number, number]>, dims = { width: 1920, height: 1080 }) =>
  ({
    source_files: [{ source_id: 0, url: 'https://example.com/a.mp4', dimension: dims }],
    segments: segments.map(([scene_id, start_ms, end_ms]) => ({ scene_id, source_id: 0, start_ms, end_ms, muted: false })),
  }) as unknown as VideoCutdownResult;

describe('outputSize', () => {
  it('keeps landscape sources and caps the short side', () => {
    expect(outputSize({ width: 1920, height: 1080 }, 720)).toEqual({ width: 1280, height: 720 });
  });
  it('keeps portrait orientation instead of forcing 16:9', () => {
    expect(outputSize({ width: 1080, height: 1920 }, 720)).toEqual({ width: 720, height: 1280 });
  });
  it('never upscales and always returns even sizes', () => {
    expect(outputSize({ width: 641, height: 361 }, 1080)).toEqual({ width: 640, height: 360 });
  });
});

describe('planStitch', () => {
  it('lays segments end to end', () => {
    const plan = planStitch(project([[1, 1000, 3000], [2, 5000, 5500]]), unlimited);
    expect(plan.items.map((i) => [i.outputStartSec, i.durationSec])).toEqual([[0, 2], [2, 0.5]]);
    expect(plan.totalSec).toBe(2.5);
    expect(plan.violations).toEqual([]);
  });

  it('reports limit violations without throwing', () => {
    const plan = planStitch(project([[1, 0, 40_000], [2, 0, 40_000]]), {
      maxSegments: 1, maxOutputSeconds: 60, maxShortSide: 720,
    });
    expect(plan.violations).toEqual([
      { kind: 'segments', actual: 2, limit: 1 },
      { kind: 'duration', actual: 80, limit: 60 },
    ]);
  });

  it('rejects segments that end before they start or have no source', () => {
    expect(() => planStitch(project([[1, 3000, 1000]]), unlimited)).toThrow(PlanError);
    const missing = project([[1, 0, 1000]]);
    missing.segments[0].source_id = 9;
    expect(() => planStitch(missing, unlimited)).toThrow(/source 9/);
    expect(() => planStitch(project([]), unlimited)).toThrow(/at least one segment/);
  });

  it('plans every bundled sample project', () => {
    for (const sample of samples as unknown as SampleData[]) {
      expect(planStitch(sample.video_cutdown_result, unlimited).items.length).toBeGreaterThan(0);
    }
  });
});

describe('parseProject', () => {
  it('accepts the wrapped and the bare form', () => {
    const bare = project([[1, 0, 1000]]);
    expect(parseProject(JSON.stringify({ video_cutdown_result: bare }))).toEqual(bare);
    expect(parseProject(JSON.stringify(bare))).toEqual(bare);
  });
  it('explains what is wrong', () => {
    expect(() => parseProject('{')).toThrow(/not valid/);
    expect(() => parseProject('{"segments": [], "source_files": [{}]}')).toThrow(/source_files\[0\]/);
    expect(() => parseProject('{"segments": [{"scene_id": 1}], "source_files": []}')).toThrow(/segments\[0\]/);
  });
});
