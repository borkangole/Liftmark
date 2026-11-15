import { describe, expect, it } from 'vitest';

import { axisTicks } from '../chartTicks';

describe('axisTicks', () => {
  it('gives three gridlines for a normal range', () => {
    expect(axisTicks(70, 73, 0.4)).toEqual([72.6, 71.5, 70.4]);
  });
  it('collapses to one gridline when every weigh-in is the same weight', () => {
    // Two weigh-ins at 72 kg: the chart pads to 71.6–72.4, so top, middle and bottom are all 72.
    expect(axisTicks(71.6, 72.4, 0.4)).toEqual([72]);
  });
  it('never returns duplicates as displayed', () => {
    for (const [lo, hi] of [[71.95, 72.05], [80, 80.1], [65.2, 65.3]]) {
      const ticks = axisTicks(lo - 0.4, hi + 0.4, 0.4).map((v) => v.toFixed(1));
      expect(new Set(ticks).size).toBe(ticks.length);
    }
  });
});
