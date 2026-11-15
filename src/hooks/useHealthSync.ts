import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncHealth } from '@/lib/health/sync';
import { useHealth } from '@/stores/useHealth';

/**
 * Keeps health data fresh: on launch, when the app returns to the front, and right after a workout
 * or weigh-in changes (so a finished session reaches the watch's activity rings). Mounted in the tabs.
 */
export function useHealthSync() {
  const connected = useHealth((s) => s.connected);
  useEffect(() => {
    if (!connected) return;
    syncHealth().catch(console.warn);
    const app = AppState.addEventListener('change', (s) => s === 'active' && syncHealth().catch(console.warn));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const db = addDatabaseChangeListener(({ tableName }) => {
      if (tableName !== 'workouts') return;
      clearTimeout(timer);
      timer = setTimeout(() => syncHealth({ force: true }).catch(console.warn), 3000);
    });
    return () => {
      app.remove();
      db.remove();
      clearTimeout(timer);
    };
  }, [connected]);
}
