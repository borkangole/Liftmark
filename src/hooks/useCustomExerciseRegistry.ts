import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { exercises } from '@/db/schema';
import { registerCustomTargets } from '@/features/muscles/targets';

/** Keeps name-only muscle lookups (history cards, split previews) aware of custom exercises. */
export function useCustomExerciseRegistry() {
  const { data } = useLiveQuery(
    db
      .select({ name: exercises.name, primaryMuscle: exercises.primaryMuscle, targetMuscles: exercises.targetMuscles })
      .from(exercises)
      .where(eq(exercises.isCustom, true)),
  );
  useEffect(() => registerCustomTargets(data), [data]);
}
