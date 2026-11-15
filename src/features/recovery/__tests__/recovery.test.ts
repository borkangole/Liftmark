import { describe, expect, it } from 'vitest';

import type { Targets } from '@/features/muscles/targets';
import { buildRecovery, notReadyFor, readyWhen, stateOf } from '../recovery';

const now = new Date(2026, 10, 15, 18); // Sun 6 PM
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);
const T = (primary: Targets['primary'], secondary: Targets['secondary'] = []): Targets => ({ primary, secondary });
const LEGS = T(['quads', 'hamstrings', 'glutes', 'calves']);

describe('buildRecovery', () => {
  it('everything ready with no recent training', () => {
    const r = buildRecovery([], now);
    expect(r.allReady).toBe(true);
    expect(r.parts.every((p) => p.readyAt === null)).toBe(true);
  });

  it('a hard leg day this morning: legs tired, upper body ready', () => {
    const r = buildRecovery([{ targets: LEGS, at: ago(8), sets: 12 }], now);
    const legs = r.parts.find((p) => p.label === 'Legs')!;
    expect(legs.state).toBe('tired');
    expect(legs.readyAt!.getTime()).toBeGreaterThan(now.getTime() + 48 * 3_600_000);
    expect(r.parts.find((p) => p.label === 'Chest')!.state).toBe('ready');
    expect(r.allReady).toBe(false);
  });

  it('fatigue fades: two days later the same legs are only recovering', () => {
    const r = buildRecovery([{ targets: LEGS, at: ago(50), sets: 12 }], now);
    expect(r.muscles.quads.state).toBe('recovering');
  });

  it('short sleep pushes "ready" later', () => {
    const work = [{ targets: LEGS, at: ago(8), sets: 12 }];
    const normal = buildRecovery(work, now).parts.find((p) => p.label === 'Legs')!.readyAt!;
    const tired = buildRecovery(work, now, 90).parts.find((p) => p.label === 'Legs')!.readyAt!;
    expect(tired.getTime()).toBeGreaterThan(normal.getTime());
  });

  it('flags a planned day that hits tired muscles', () => {
    const r = buildRecovery([{ targets: LEGS, at: ago(8), sets: 12 }], now);
    expect(notReadyFor(LEGS, r).map((p) => p.label)).toEqual(['Legs']);
    expect(notReadyFor(T(['chest']), r)).toEqual([]);
  });
});

describe('stateOf', () => {
  it('has three bands', () => {
    expect([stateOf(0), stateOf(3), stateOf(9)]).toEqual(['ready', 'recovering', 'tired']);
  });
});

describe('readyWhen', () => {
  it('reads naturally', () => {
    expect(readyWhen(new Date(2026, 10, 15, 21), now)).toBe('in 3 h');
    expect(readyWhen(new Date(2026, 10, 16, 7), now)).toBe('tomorrow morning');
    expect(readyWhen(new Date(2026, 10, 17, 18), now)).toBe('Tue evening');
    expect(readyWhen(new Date(2026, 10, 18, 1), now)).toBe('Wed morning');
    expect(readyWhen(new Date(2026, 10, 15, 20), new Date(2026, 10, 15, 8))).toBe('tonight');
  });
});
