import { describe, expect, it } from 'vitest';

import { afterSupersetSet, pairsFromPlan, sameMuscle, supersetOf, togglePair } from '../superset';

describe('pairsFromPlan', () => {
  it('pairs adjacent items in the same group only', () => {
    const plan = [
      { exerciseId: 1, supersetGroup: null },
      { exerciseId: 2, supersetGroup: 10 },
      { exerciseId: 3, supersetGroup: 10 },
      { exerciseId: 4, supersetGroup: 20 },
      { exerciseId: 5, supersetGroup: null },
    ];
    expect(pairsFromPlan(plan)).toEqual([[2, 3]]);
  });
});

describe('togglePair', () => {
  it('links, unlinks, and keeps each exercise in one pair', () => {
    let p = togglePair([], 1, 2);
    expect(p).toEqual([[1, 2]]);
    p = togglePair(p, 2, 3);
    expect(p).toEqual([[2, 3]]);
    expect(togglePair(p, 3, 2)).toEqual([]);
  });
});

describe('supersetOf', () => {
  it('gives letters in workout order and positions', () => {
    const pairs: [number, number][] = [[5, 6], [1, 2]];
    const order = [1, 2, 3, 5, 6];
    expect(supersetOf(pairs, order, 1)).toEqual({ letter: 'A', position: 1, partnerId: 2 });
    expect(supersetOf(pairs, order, 6)).toEqual({ letter: 'B', position: 2, partnerId: 5 });
    expect(supersetOf(pairs, order, 3)).toBeNull();
  });
});

describe('afterSupersetSet', () => {
  const base = { warmup: false, mySeconds: 180, partnerSeconds: 90, partnerTarget: 3 };
  it('switches to the partner mid-round', () => {
    expect(afterSupersetSet({ ...base, myWorking: 1, partnerWorking: 0 })).toEqual({ action: 'switch' });
  });
  it('rests the longer of the two once the round is done', () => {
    expect(afterSupersetSet({ ...base, mySeconds: 90, partnerSeconds: 180, myWorking: 1, partnerWorking: 1 })).toEqual({
      action: 'rest',
      seconds: 180,
    });
  });
  it('rests normally once the partner is finished', () => {
    expect(afterSupersetSet({ ...base, myWorking: 4, partnerWorking: 3 })).toEqual({ action: 'rest', seconds: 180 });
  });
  it('keeps warm-ups short', () => {
    expect(afterSupersetSet({ ...base, warmup: true, myWorking: 0, partnerWorking: 0 })).toEqual({ action: 'rest', seconds: 60 });
  });
});

describe('sameMuscle', () => {
  it('flags same-group pairs', () => {
    expect(sameMuscle({ muscleGroup: 'chest' }, { muscleGroup: 'chest' })).toBe(true);
    expect(sameMuscle({ muscleGroup: 'chest' }, { muscleGroup: 'back' })).toBe(false);
  });
});
