import { describe, expect, it } from 'vitest';

import {
  autoWorkoutDays,
  DEFAULT_REMINDERS,
  formatClock,
  planReminders,
  weekStreakBefore,
  type ReminderInput,
  type ReminderKind,
} from '../plan';

// Sun 15 Nov 2026, 10:00
const now = new Date(2026, 10, 15, 10);
const day = (d: number, h = 18) => new Date(2026, 10, d, h);

function input(over: Partial<ReminderInput> = {}, enabled: Partial<Record<ReminderKind, boolean>> = {}): ReminderInput {
  return {
    now,
    settings: { ...DEFAULT_REMINDERS, enabled: { ...DEFAULT_REMINDERS.enabled, ...enabled } },
    workoutDates: [],
    daysPerWeek: 3,
    nextDayName: 'Push Day',
    food: null,
    weighIn: null,
    plateau: null,
    ...over,
  };
}

const kinds = (list: { kind: string }[]) => list.map((r) => r.kind);

describe('autoWorkoutDays', () => {
  it('uses the weekdays you actually train on', () => {
    // Tuesdays and Saturdays, three weeks running
    const habit = [day(3), day(7), day(10), day(14)];
    expect(autoWorkoutDays(habit, 3, now)).toEqual([2, 6]);
  });

  it('falls back to a spread of the plan', () => {
    expect(autoWorkoutDays([], 3, now)).toEqual([1, 3, 5]);
    expect(autoWorkoutDays([], null, now)).toEqual([1, 3, 5]);
  });
});

describe('planReminders', () => {
  it('reminds on training days at the chosen time, naming the next session once', () => {
    const plan = planReminders(input({ settings: { ...DEFAULT_REMINDERS, workoutDays: [1, 3, 5] } }));
    const workouts = plan.filter((r) => r.kind === 'workout');
    expect(workouts.map((r) => r.at.getDate())).toEqual([16, 18, 20]);
    expect(workouts[0].at.getHours()).toBe(17);
    expect(workouts[0].title).toBe('Push Day today 💪');
    expect(workouts[1].title).toBe('Training day 💪');
  });

  it('drops today’s workout reminder once you’ve trained', () => {
    const settings = { ...DEFAULT_REMINDERS, workoutDays: [0] };
    expect(planReminders(input({ settings })).some((r) => r.at.getDate() === 15)).toBe(true);
    expect(planReminders(input({ settings, workoutDates: [day(15, 8)] })).some((r) => r.at.getDate() === 15)).toBe(false);
  });

  it('never schedules in the past', () => {
    const late = new Date(2026, 10, 15, 21);
    const plan = planReminders(input({ now: late, settings: { ...DEFAULT_REMINDERS, workoutDays: [0] } }));
    expect(plan.every((r) => r.at > late)).toBe(true);
  });

  it('protein: today’s real gap and a pick, or nothing when on target', () => {
    const food = { today: { proteinLeft: 43, kcalOver: 0, meals: ['lunch' as const] }, proteinPick: 'Greek yogurt' };
    const today = planReminders(input({ food })).find((r) => r.kind === 'protein' && r.at.getDate() === 15);
    expect(today?.title).toBe('45 g protein to go');
    expect(today?.body).toContain('Greek yogurt');
    expect(today?.at.getHours()).toBe(20);

    const done = { ...food, today: { ...food.today, proteinLeft: 5 } };
    expect(planReminders(input({ food: done })).some((r) => r.kind === 'protein' && r.at.getDate() === 15)).toBe(false);
  });

  it('skips food reminders for people who don’t log food', () => {
    expect(kinds(planReminders(input({}, { meals: true, protein: true, over: true })))).not.toContain('protein');
  });

  it('meal reminders skip meals already logged today', () => {
    const food = { today: { proteinLeft: 0, kcalOver: 0, meals: ['lunch' as const] }, proteinPick: null };
    const today = planReminders(input({ food }, { meals: true, workout: false })).filter(
      (r) => r.kind === 'meals' && r.at.getDate() === 15,
    );
    expect(today.map((r) => r.title)).toEqual(['Log your dinner?']);
  });

  it('over target only for today, and only by a real margin', () => {
    const food = (kcalOver: number) => ({ today: { proteinLeft: 0, kcalOver, meals: [] }, proteinPick: null });
    expect(kinds(planReminders(input({ food: food(150) }, { over: true })))).not.toContain('over');
    const over = planReminders(input({ food: food(320) }, { over: true })).filter((r) => r.kind === 'over');
    expect(over).toHaveLength(1);
    expect(over[0].title).toBe('320 kcal over today');
  });

  it('weigh-in on the weigh-in day, skipped once logged', () => {
    const plan = planReminders(input({ weighIn: { day: 1, loggedThisWeek: false } }));
    const w = plan.filter((r) => r.kind === 'weighIn');
    expect(w.map((r) => r.at.getDate())).toEqual([16]);
    expect(w[0].url).toBe('/bodyweight/log');

    const sunday = planReminders(
      input({ now: new Date(2026, 10, 15, 6), weighIn: { day: 0, loggedThisWeek: true } }),
    ).filter((r) => r.kind === 'weighIn');
    expect(sunday).toEqual([]);
  });

  it('streak saver on Sunday evening when the week has no workout yet', () => {
    const past = [new Date(2026, 9, 21), new Date(2026, 9, 28), day(4)]; // the three weeks before this one
    expect(weekStreakBefore(past, now)).toBe(3);
    const s = planReminders(input({ workoutDates: past }, { streak: true })).filter((r) => r.kind === 'streak');
    expect(s).toHaveLength(1);
    expect(s[0].title).toBe('Your 3-week streak ends tonight');
    expect(s[0].at).toEqual(new Date(2026, 10, 15, 18));

    const trained = planReminders(input({ workoutDates: [...past, day(12)] }, { streak: true }));
    expect(kinds(trained)).not.toContain('streak');
  });

  it('plateau alert the next morning, opening the lift', () => {
    const p = planReminders(
      input({ plateau: { exerciseId: 7, name: 'Bench Press', state: 'slowing' } }, { plateau: true }),
    ).find((r) => r.kind === 'plateau');
    expect(p?.at).toEqual(new Date(2026, 10, 16, 9));
    expect(p?.title).toBe('Bench Press is slowing down');
    expect(p?.url).toBe('/exercise/7');
  });

  it('caps each day, keeping the most useful', () => {
    const food = { today: null, proteinPick: null };
    const plan = planReminders(
      input(
        {
          settings: { ...DEFAULT_REMINDERS, workoutDays: [1] },
          food,
          weighIn: { day: 1, loggedThisWeek: false },
        },
        { meals: true },
      ),
    );
    const monday = plan.filter((r) => r.at.getDate() === 16);
    expect(monday).toHaveLength(3);
    expect(kinds(monday).sort()).toEqual(['protein', 'weighIn', 'workout']);
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
  });

  it('everything off means nothing scheduled', () => {
    const off = Object.fromEntries(Object.keys(DEFAULT_REMINDERS.enabled).map((k) => [k, false]));
    expect(planReminders(input({ food: { today: null, proteinPick: null } }, off))).toEqual([]);
  });
});

describe('formatClock', () => {
  it('reads like a phone clock', () => {
    expect(formatClock(17 * 60)).toBe('5:00 PM');
    expect(formatClock(7 * 60 + 30)).toBe('7:30 AM');
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(12 * 60)).toBe('12:00 PM');
  });
});
