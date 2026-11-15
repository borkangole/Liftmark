import { describe, expect, it } from 'vitest';

import { presetExercises } from '@/db/seed';
import { SEGMENT_LENGTH, solvePose } from '../kinematics';
import { DEMOS } from '../library';
import { buildScene, repProgress } from '../scene';
import { isFront, type SideDemoSpec } from '../specs';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const all = Object.entries(DEMOS);
const side = all.filter((e): e is [string, SideDemoSpec] => !isFront(e[1]));

describe('exercise demos', () => {
  it('cover every library exercise', () => {
    const missing = presetExercises.map((e) => e.name).filter((n) => !DEMOS[n]);
    expect(missing).toEqual([]);
  });

  it.each(all)('%s exists in the exercise library', (name) => {
    expect(presetExercises.some((e) => e.name === name)).toBe(true);
  });

  it.each(side)('%s keeps its anchor fixed and limbs the same length', (_, spec) => {
    for (const pose of spec.poses) {
      const j = solvePose(pose, spec.anchor);
      expect(j[spec.anchor.joint].x).toBeCloseTo(spec.anchor.at.x, 5);
      expect(j[spec.anchor.joint].y).toBeCloseTo(spec.anchor.at.y, 5);
      expect(dist(j.hip, j.knee)).toBeCloseTo(SEGMENT_LENGTH.thigh, 5);
      expect(dist(j.knee2, j.ankle2)).toBeCloseTo(SEGMENT_LENGTH.shin, 5);
      expect(dist(j.elbow, j.wrist)).toBeCloseTo(SEGMENT_LENGTH.forearm, 5);
    }
  });

  it.each(all)('%s stays inside the 200×200 frame', (_, spec) => {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      for (const s of buildScene(spec, t)) {
        const pts = s.kind === 'line' ? [s.a, s.b] : s.kind === 'circle' ? [s.c] : [{ x: s.x, y: s.y }];
        for (const p of pts) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(200);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(200);
        }
      }
    }
  });

  it.each(side)('%s never sinks below the floor', (_, spec) => {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      for (const s of buildScene(spec, t)) {
        if (s.kind === 'line' && (s.tone === 'near' || s.tone === 'far')) {
          expect(Math.max(s.a.y, s.b.y)).toBeLessThanOrEqual(190);
        }
      }
    }
  });

  it('runs a full rep cycle', () => {
    const spec = DEMOS['Barbell Back Squat'];
    expect(repProgress(spec, 0).t).toBe(0);
    expect(repProgress(spec, spec.timing[0] + 10).t).toBe(1);
    const cycle = spec.timing.reduce((a, b) => a + b, 0);
    expect(repProgress(spec, cycle - 1).t).toBe(0);
  });
});
