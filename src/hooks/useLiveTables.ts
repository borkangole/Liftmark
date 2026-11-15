import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

/**
 * Runs `query` and re-runs it whenever any of `tables` changes.
 * Drizzle's useLiveQuery only watches the FROM table, which misses joins
 * (e.g. finishing a workout updates `workouts`, not `sets`).
 */
export function useLiveTables<T>(query: () => Promise<T>, tables: string[], initial: T, deps: unknown[] = []): T {
  const [data, setData] = useState<T>(initial);
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let active = true;
    const run = () =>
      queryRef
        .current()
        .then((d) => active && setData(d))
        .catch(console.error);
    run();
    const watched = new Set(tables);
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (watched.has(tableName)) run();
    });
    return () => {
      active = false;
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), ...deps]);

  return data;
}
