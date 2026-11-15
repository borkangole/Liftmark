/**
 * Which day of a routine comes next: the one after the most recently trained day, wrapping around.
 * Days are expected in their routine order.
 */
export function nextRoutineDay<T extends { id: number }>(days: T[], lastTrainedDayId: number | null): T | undefined {
  if (days.length === 0) return undefined;
  const lastIndex = lastTrainedDayId === null ? -1 : days.findIndex((d) => d.id === lastTrainedDayId);
  return days[(lastIndex + 1) % days.length];
}
