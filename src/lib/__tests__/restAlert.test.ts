import { beforeEach, describe, expect, it, vi } from 'vitest';

const n = vi.hoisted(() => ({
  scheduleNotificationAsync: vi.fn(async () => 'id'),
  cancelScheduledNotificationAsync: vi.fn(async () => {}),
  dismissNotificationAsync: vi.fn(async () => {}),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidNotificationPriority: { HIGH: 'high' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));
vi.mock('expo-notifications', () => n);
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, Linking: { openSettings: vi.fn() } }));

import { restAlertPermission, scheduleRestOver } from '../restAlert';

beforeEach(() => vi.clearAllMocks());

describe('scheduleRestOver', () => {
  it('replaces the earlier alert and fires at the end of rest', async () => {
    const endsAt = Date.now() + 90_000;
    await scheduleRestOver(endsAt);
    expect(n.cancelScheduledNotificationAsync).toHaveBeenCalledWith('liftmark-rest-over');
    expect(n.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'liftmark-rest-over',
        trigger: expect.objectContaining({ type: 'date', date: endsAt }),
      }),
    );
  });

  it('skips rest that is already (nearly) over', async () => {
    await scheduleRestOver(Date.now() + 500);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('restAlertPermission', () => {
  it('only asks when allowed to and the phone can still show the prompt', async () => {
    n.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await restAlertPermission(false)).toBe('undetermined');
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();

    n.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    expect(await restAlertPermission(true)).toBe('granted');

    n.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await restAlertPermission(true)).toBe('denied');
  });
});
