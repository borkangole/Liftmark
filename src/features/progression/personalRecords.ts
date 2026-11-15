import { summarizeSession, type SessionSummary } from './oneRepMax';
import type { Session } from './types';

export type PrKind = 'e1rm' | 'weight' | 'volume';

/** PRs set by the latest session compared with every earlier session. */
export function detectPersonalRecords(history: Session[]): PrKind[] {
  if (history.length === 0) return [];
  const sorted = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
  const summaries = sorted.map(summarizeSession);
  const latest = summaries[summaries.length - 1];
  const previous = summaries.slice(0, -1);
  if (previous.length === 0) return [];

  const best = (key: keyof Omit<SessionSummary, 'date'>) => Math.max(...previous.map((s) => s[key]));
  const prs: PrKind[] = [];
  if (latest.bestE1rm > best('bestE1rm')) prs.push('e1rm');
  if (latest.topWeight > best('topWeight')) prs.push('weight');
  if (latest.volume > best('volume')) prs.push('volume');
  return prs;
}
