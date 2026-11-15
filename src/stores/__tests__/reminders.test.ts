import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/kv-store', () => {
  const m = new Map<string, string>();
  return {
    default: {
      getItemSync: (k: string) => m.get(k) ?? null,
      setItemSync: (k: string, v: string) => m.set(k, v),
      removeItemSync: (k: string) => m.delete(k),
    },
  };
});

import { useReminders } from '../useReminders';

const lift = (state: 'slowing' | 'stuck' | null) => [{ exerciseId: 1, name: 'Bench Press', state }];

beforeEach(() => useReminders.setState({ announced: {}, pending: null }));

describe('observePlateaus', () => {
  it('announces each stall once, and again only when it gets worse', () => {
    const { observePlateaus } = useReminders.getState();
    observePlateaus(lift('slowing'));
    expect(useReminders.getState().pending?.state).toBe('slowing');

    useReminders.setState({ pending: null });
    observePlateaus(lift('slowing'));
    expect(useReminders.getState().pending).toBeNull();

    observePlateaus(lift('stuck'));
    expect(useReminders.getState().pending?.state).toBe('stuck');

    useReminders.setState({ pending: null });
    observePlateaus(lift('slowing'));
    expect(useReminders.getState().pending).toBeNull();
  });

  it('a lift that recovers can be announced again next time', () => {
    const { observePlateaus } = useReminders.getState();
    observePlateaus(lift('stuck'));
    observePlateaus(lift(null));
    expect(useReminders.getState().announced).toEqual({});
    useReminders.setState({ pending: null });
    observePlateaus(lift('slowing'));
    expect(useReminders.getState().pending?.name).toBe('Bench Press');
  });
});
