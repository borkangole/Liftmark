import { useEffect } from 'react';
import { AppState } from 'react-native';

import { applyRotation } from '@/lib/splitSwitch';

/** Weekly split rotation: checked when the app opens or comes back to the front. Mounted in the tabs. */
export function useSplitRotation() {
  useEffect(() => {
    const run = () => applyRotation().catch(console.error);
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, []);
}
