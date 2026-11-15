import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { dateFromKey, dayKeyOf, weekStart, type BodyEntry } from '@/features/bodyweight/trend';
import { db } from './client';
import { bodyweights } from './schema';

export interface BodyweightRow extends BodyEntry {
  id: number;
  day: string;
}

/** Every weigh-in, oldest first. */
export async function fetchBodyweights(): Promise<BodyweightRow[]> {
  const rows = await db.select().from(bodyweights).orderBy(asc(bodyweights.day));
  return rows.map((r) => ({ id: r.id, day: r.day, date: dateFromKey(r.day), weightKg: r.weightKg }));
}

/** Saves this week's weigh-in, replacing any other logged in the same weigh-in week. */
export async function logBodyweight(date: Date, weightKg: number, weighInDay: number) {
  const start = weekStart(date, weighInDay);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  await db.transaction(async (tx) => {
    await tx.delete(bodyweights).where(and(gte(bodyweights.day, dayKeyOf(start)), lte(bodyweights.day, dayKeyOf(end))));
    await tx.insert(bodyweights).values({ day: dayKeyOf(date), weightKg });
  });
}

export const deleteBodyweight = (id: number) => db.delete(bodyweights).where(eq(bodyweights.id, id));
