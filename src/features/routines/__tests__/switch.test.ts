import { describe, expect, it } from 'vitest';

import type { Targets } from '@/features/muscles/targets';
import { dayFatigue, muscleFatigue, pickStartDay, recentParts, rotationIndex, type RecentWork } from '../switch';

const now = new Date(2026, 10, 15, 18); // Sun evening
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);

const T = (primary: Targets['primary'], secondary: Targets['secondary'] = []): Targets => ({ primary, secondary });
const UPPER = T(['chest', 'lats', 'frontDelts', 'biceps', 'triceps'], ['sideDelts', 'rearDelts']);
const LOWER = T(['quads', 'hamstrings', 'glutes', 'calves'], ['lowerBack']);

const PPL = [
  { name: 'Push', targets: T(['chest', 'frontDelts', 'sideDelts', 'triceps']) },
  { name: 'Pull', targets: T(['lats', 'traps', 'rearDelts', 'biceps']) },
  { name: 'Legs', targets: T(['quads', 'hamstrings', 'glutes', 'calves']) },
];

describe('muscleFatigue', () => {
  it('fades to nothing over three days', () => {
    const work: RecentWork[] = [{ targets: T(['chest'], ['triceps']), at: ago(36), sets: 10 }];
    const f = muscleFatigue(work, now);
    expect(f.chest).toBeCloseTo(5);
    expect(f.triceps).toBeCloseTo(2.5);
    expect(muscleFatigue([{ ...work[0], at: ago(80) }], now)).toEqual({});
  });
});

describe('pickStartDay', () => {
  it('Upper yesterday → Upper/Lower switching to PPL starts with Legs', () => {
    const work = [{ targets: UPPER, at: ago(24), sets: 16 }];
    const pick = pickStartDay(PPL, work, now);
    expect(pick?.day.name).toBe('Legs');
    expect(pick?.reason).toBe('Legs is rested · chest trained yesterday');
  });

  it('Upper then Lower → starts with Push when upper body has had the most rest', () => {
    const work = [
      { targets: UPPER, at: ago(60), sets: 16 },
      { targets: LOWER, at: ago(20), sets: 14 },
    ];
    const pick = pickStartDay(PPL, work, now);
    expect(['Push', 'Pull']).toContain(pick?.day.name);
    expect(pick?.reason).toContain('legs trained yesterday');
  });

  it('nothing recent: start from the first day', () => {
    const pick = pickStartDay(PPL, [], now);
    expect(pick?.day.name).toBe('Push');
    expect(pick?.reason).toMatch(/rested/);
  });

  it('prefers the earlier day when two are about as rested', () => {
    const work = [{ targets: T(['chest']), at: ago(70), sets: 1 }];
    expect(pickStartDay(PPL, work, now)?.index).toBe(0);
  });
});

describe('recentParts', () => {
  it('lists what was trained, most recent first', () => {
    const parts = recentParts(
      [
        { targets: LOWER, at: ago(10), sets: 12 },
        { targets: T(['chest']), at: ago(50), sets: 6 },
      ],
      now,
    );
    expect(parts.map((p) => [p.label, p.when])).toEqual([
      ['Legs', 'today'],
      ['Chest', '2 days ago'],
    ]);
  });
});

describe('dayFatigue', () => {
  it('is 0 for an untouched day', () => {
    expect(dayFatigue(PPL[2].targets, { chest: 5 })).toBe(0);
  });
});

describe('rotationIndex', () => {
  it('alternates weekly', () => {
    const start = new Date(2026, 10, 2);
    expect(rotationIndex(start, new Date(2026, 10, 2), 2)).toBe(0);
    expect(rotationIndex(start, new Date(2026, 10, 9), 2)).toBe(1);
    expect(rotationIndex(start, new Date(2026, 10, 16), 2)).toBe(0);
    expect(rotationIndex(start, new Date(2026, 10, 23), 3)).toBe(0);
  });
});

describe('with the real presets', () => {
  it('every preset day maps to muscles, so the pick is meaningful', async () => {
    const { SPLIT_PRESETS } = await import('../presets');
    const { targetsForNames } = await import('@/features/muscles/targets');
    for (const p of SPLIT_PRESETS)
      for (const d of p.days) expect(targetsForNames(d.exercises.map((e) => e.name)).primary.length).toBeGreaterThan(0);
  });

  it('Upper/Lower → PPL after an Upper day picks Legs', async () => {
    const { getPreset } = await import('../presets');
    const { targetsForNames } = await import('@/features/muscles/targets');
    const ul = getPreset('upper-lower')!;
    const ppl = getPreset('ppl')!;
    const upper = targetsForNames(ul.days[0].exercises.map((e) => e.name));
    const days = ppl.days.map((d) => ({ name: d.name, targets: targetsForNames(d.exercises.map((e) => e.name)) }));
    expect(pickStartDay(days, [{ targets: upper, at: ago(20), sets: 18 }], now)?.day.name).toBe('Legs');
  });
});
