/**
 * Supersets: two exercises done back to back, alternating sets, resting only after both.
 * Pairing opposing muscles keeps your reps; pairing the same muscle costs some volume
 * (Zhang et al. 2025, Sports Medicine meta-analysis of 19 studies).
 */

export type Pair = [number, number];

/** Pairs from a routine plan: adjacent items that share a superset group. */
export function pairsFromPlan(plan: { exerciseId: number; supersetGroup: number | null }[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < plan.length - 1; i++) {
    const a = plan[i];
    const b = plan[i + 1];
    if (a.supersetGroup !== null && a.supersetGroup === b.supersetGroup) {
      pairs.push([a.exerciseId, b.exerciseId]);
      i++;
    }
  }
  return pairs;
}

/** Link a and b, or unlink them if they're already a pair. An exercise is only ever in one pair. */
export function togglePair(pairs: Pair[], a: number, b: number): Pair[] {
  const exists = pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const rest = pairs.filter(([x, y]) => x !== a && y !== a && x !== b && y !== b);
  return exists ? rest : [...rest, [a, b]];
}

/** Where an exercise sits in its superset, if any: its partner, position (1 or 2) and the pair's letter. */
export function supersetOf(pairs: Pair[], order: number[], exerciseId: number) {
  // Letters follow the order the pairs appear in the workout: A, B, C…
  const sorted = [...pairs].sort((p, q) => order.indexOf(p[0]) - order.indexOf(q[0]));
  for (const [i, [a, b]] of sorted.entries()) {
    if (a !== exerciseId && b !== exerciseId) continue;
    const first = order.indexOf(a) <= order.indexOf(b) ? a : b;
    return {
      letter: String.fromCharCode(65 + (i % 26)),
      position: exerciseId === first ? 1 : 2,
      partnerId: exerciseId === a ? b : a,
    } as const;
  }
  return null;
}

export type AfterSet = { action: 'rest'; seconds: number } | { action: 'switch' };

/**
 * What happens after logging a set in a superset.
 * Rest only once both exercises have done this round; otherwise go straight to the partner.
 * The rest after a round is the longer of the two, so the heavier lift gets its full recovery.
 */
export function afterSupersetSet(o: {
  warmup: boolean;
  mySeconds: number;
  partnerSeconds: number;
  /** My working sets including the one just logged. */
  myWorking: number;
  partnerWorking: number;
  partnerTarget: number;
}): AfterSet {
  if (o.warmup) return { action: 'rest', seconds: Math.min(60, o.mySeconds) };
  if (o.partnerWorking >= o.partnerTarget) return { action: 'rest', seconds: o.mySeconds };
  if (o.partnerWorking >= o.myWorking) return { action: 'rest', seconds: Math.max(o.mySeconds, o.partnerSeconds) };
  return { action: 'switch' };
}

/** Same main muscle group: the second exercise starts pre-tired, so expect fewer reps. */
export const sameMuscle = (a: { muscleGroup: string }, b: { muscleGroup: string }) => a.muscleGroup === b.muscleGroup;
