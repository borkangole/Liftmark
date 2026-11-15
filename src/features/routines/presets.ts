/** Built-in training splits. Users copy one into "My routines" and edit it from there. */
export interface PresetExercise {
  name: string; // must match an exercise in the seed library
  sets: number;
}

export interface PresetDay {
  name: string;
  focus: string;
  exercises: PresetExercise[];
}

export interface SplitPreset {
  key: string;
  name: string;
  tagline: string;
  daysPerWeek: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  bestFor: string;
  days: PresetDay[];
}

const ex = (name: string, sets = 3): PresetExercise => ({ name, sets });

export const SPLIT_PRESETS: SplitPreset[] = [
  {
    key: 'full-body',
    name: 'Full Body',
    tagline: 'Every muscle, three times a week',
    daysPerWeek: '3 days / week',
    level: 'Beginner',
    bestFor: 'New lifters and busy weeks. Each lift gets practiced often, so strength comes quickly.',
    days: [
      {
        name: 'Full Body A',
        focus: 'Squat, bench, row',
        exercises: [ex('Barbell Back Squat'), ex('Barbell Bench Press'), ex('Barbell Row'), ex('Plank')],
      },
      {
        name: 'Full Body B',
        focus: 'Deadlift, press, pulldown',
        exercises: [ex('Deadlift'), ex('Overhead Press'), ex('Lat Pulldown'), ex('Hanging Leg Raise')],
      },
      {
        name: 'Full Body C',
        focus: 'Machines and dumbbells',
        exercises: [ex('Leg Press'), ex('Incline Dumbbell Press'), ex('Seated Cable Row'), ex('Lateral Raise')],
      },
    ],
  },
  {
    key: 'upper-lower',
    name: 'Upper / Lower',
    tagline: 'Balanced strength and size',
    daysPerWeek: '4 days / week',
    level: 'Intermediate',
    bestFor: 'The next step after full body. Hits everything twice a week with more volume per session.',
    days: [
      {
        name: 'Upper A',
        focus: 'Strength focus',
        exercises: [
          ex('Barbell Bench Press', 4),
          ex('Barbell Row', 4),
          ex('Overhead Press'),
          ex('Lat Pulldown'),
          ex('Barbell Curl', 2),
          ex('Triceps Pushdown', 2),
        ],
      },
      {
        name: 'Lower A',
        focus: 'Squat focus',
        exercises: [
          ex('Barbell Back Squat', 4),
          ex('Romanian Deadlift'),
          ex('Leg Press'),
          ex('Leg Curl'),
          ex('Standing Calf Raise'),
        ],
      },
      {
        name: 'Upper B',
        focus: 'Volume focus',
        exercises: [
          ex('Overhead Press', 4),
          ex('Pull-up', 4),
          ex('Incline Dumbbell Press'),
          ex('Seated Cable Row'),
          ex('Lateral Raise'),
          ex('Hammer Curl', 2),
        ],
      },
      {
        name: 'Lower B',
        focus: 'Hinge focus',
        exercises: [
          ex('Deadlift'),
          ex('Hip Thrust'),
          ex('Walking Lunge'),
          ex('Leg Extension'),
          ex('Hanging Leg Raise'),
        ],
      },
    ],
  },
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: 'The classic split, run twice a week',
    daysPerWeek: '3–6 days / week',
    level: 'Intermediate',
    bestFor: 'Lifters who like training often. Run it 3 days for a lighter week or 6 for maximum volume.',
    days: [
      {
        name: 'Push',
        focus: 'Chest, shoulders, triceps',
        exercises: [
          ex('Barbell Bench Press', 4),
          ex('Overhead Press'),
          ex('Incline Dumbbell Press'),
          ex('Lateral Raise'),
          ex('Triceps Pushdown'),
          ex('Overhead Triceps Extension'),
        ],
      },
      {
        name: 'Pull',
        focus: 'Back, rear delts, biceps',
        exercises: [
          ex('Barbell Row', 4),
          ex('Pull-up'),
          ex('Lat Pulldown'),
          ex('Face Pull'),
          ex('Barbell Curl'),
          ex('Hammer Curl'),
        ],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, calves',
        exercises: [
          ex('Barbell Back Squat', 4),
          ex('Romanian Deadlift'),
          ex('Leg Press'),
          ex('Leg Curl'),
          ex('Standing Calf Raise', 4),
        ],
      },
    ],
  },
  {
    key: 'bro-split',
    name: 'Bro Split',
    tagline: 'One muscle group a day',
    daysPerWeek: '5 days / week',
    level: 'Advanced',
    bestFor: 'Experienced lifters chasing size. Lots of volume per muscle, with a full week to recover.',
    days: [
      {
        name: 'Chest',
        focus: 'Presses and flyes',
        exercises: [ex('Barbell Bench Press', 4), ex('Incline Dumbbell Press'), ex('Cable Fly'), ex('Dip')],
      },
      {
        name: 'Back',
        focus: 'Width and thickness',
        exercises: [ex('Deadlift'), ex('Pull-up'), ex('Barbell Row'), ex('Seated Cable Row')],
      },
      {
        name: 'Shoulders',
        focus: 'All three heads',
        exercises: [
          ex('Overhead Press', 4),
          ex('Dumbbell Shoulder Press'),
          ex('Lateral Raise', 4),
          ex('Rear Delt Fly'),
        ],
      },
      {
        name: 'Arms',
        focus: 'Biceps and triceps',
        exercises: [ex('Barbell Curl'), ex('Skull Crusher'), ex('Hammer Curl'), ex('Triceps Pushdown')],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, calves',
        exercises: [
          ex('Barbell Back Squat', 4),
          ex('Leg Press'),
          ex('Romanian Deadlift'),
          ex('Leg Extension'),
          ex('Standing Calf Raise', 4),
        ],
      },
    ],
  },
];

export const getPreset = (key: string) => SPLIT_PRESETS.find((p) => p.key === key);
