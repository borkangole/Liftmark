import { GROUND_Y, type DemoSpec, type Prop } from './specs';

/**
 * Original form demos for every library exercise. Each is two poses plus tempo.
 * Angles: 0 = down, 90 = forward (right), 180 = up, -90 = back (left).
 */

const FEET = GROUND_Y - 4;
const standingLegs = { thigh: 0, shin: 0, foot: 90 };
const stand = (x = 92) => ({ joint: 'ankle' as const, at: { x, y: FEET } });

// Scenery
const flatBench = (x: number, y: number, w: number): Prop[] => [
  { kind: 'rect', x, y, w, h: 9 },
  { kind: 'rect', x: x + 8, y: y + 9, w: 5, h: GROUND_Y - y - 9 },
  { kind: 'rect', x: x + w - 13, y: y + 9, w: 5, h: GROUND_Y - y - 9 },
];
const seat = (x: number, y: number, w = 34): Prop[] => [
  { kind: 'rect', x, y, w, h: 8 },
  { kind: 'rect', x: x + w / 2 - 3, y: y + 8, w: 6, h: GROUND_Y - y - 8 },
];
const backrest = (from: { x: number; y: number }, to: { x: number; y: number }): Prop => ({
  kind: 'line',
  a: from,
  b: to,
  width: 8,
});
const pullupBar = (x: number, y: number): Prop[] => [
  { kind: 'line', a: { x: x - 40, y }, b: { x: x + 40, y }, width: 4 },
];
const tower = (x: number): Prop => ({ kind: 'line', a: { x, y: 12 }, b: { x, y: GROUND_Y }, width: 5 });

export const DEMOS: Record<string, DemoSpec> = {
  // ------------------------------------------------------------------ Legs
  'Barbell Back Squat': {
    anchor: stand(),
    poses: [
      { torso: 180, upperArm: -40, forearm: 165, ...standingLegs },
      { torso: 142, upperArm: -12, forearm: 140, thigh: 84, shin: -32, foot: 90 },
    ],
    timing: [1600, 250, 1000, 600],
    cues: ['Sit back and down, chest up', 'Drive through your whole foot'],
    highlights: [{ segment: 'thigh' }, { joint: 'hip', radius: 8, back: 6 }],
    muscles: ['Quads', 'Glutes', 'Adductors'],
    equipment: { type: 'barbell', joint: 'shoulder', offset: { back: 7, up: -3 } },
  },
  'Leg Press': {
    anchor: { joint: 'hip', at: { x: 72, y: 148 } },
    poses: [
      { torso: -125, upperArm: 10, forearm: 60, thigh: 128, shin: 128, foot: 218 },
      { torso: -125, upperArm: 10, forearm: 60, thigh: 168, shin: 82, foot: 172 },
    ],
    timing: [1500, 250, 1000, 500],
    cues: ['Lower the sled to your chest', 'Press through your heels'],
    highlights: [{ segment: 'thigh' }, { joint: 'hip', radius: 8, back: 5 }],
    muscles: ['Quads', 'Glutes'],
    equipment: { type: 'pad', joint: 'ankle' },
    props: [...seat(52, 152, 40), backrest({ x: 70, y: 150 }, { x: 34, y: 124 })],
  },
  'Romanian Deadlift': {
    anchor: stand(),
    poses: [
      { torso: 180, upperArm: 0, forearm: 0, ...standingLegs },
      { torso: 102, upperArm: 0, forearm: 0, thigh: 14, shin: -4, foot: 90 },
    ],
    timing: [1600, 300, 1100, 500],
    cues: ['Push your hips back, bar close', 'Squeeze glutes to stand tall'],
    highlights: [{ segment: 'thigh', from: 0.1, to: 0.9 }, { joint: 'hip', radius: 8, back: 6 }],
    muscles: ['Hamstrings', 'Glutes', 'Lower back'],
    equipment: { type: 'barbell', joint: 'wrist' },
  },
  Deadlift: {
    anchor: stand(),
    poses: [
      { torso: 122, upperArm: 4, forearm: 2, thigh: 62, shin: -22, foot: 90 },
      { torso: 180, upperArm: 0, forearm: 0, ...standingLegs },
    ],
    timing: [1100, 400, 1500, 600],
    cues: ['Push the floor away', 'Hinge back down, bar close'],
    highlights: [
      { segment: 'thigh', from: 0.1, to: 0.9 },
      { joint: 'hip', radius: 8, back: 6 },
      { segment: 'torso', from: 0, to: 0.45 },
    ],
    muscles: ['Glutes', 'Hamstrings', 'Lower back'],
    equipment: { type: 'barbell', joint: 'wrist' },
  },
  'Leg Curl': {
    anchor: { joint: 'hip', at: { x: 100, y: 124 } },
    poses: [
      { torso: -90, upperArm: 30, forearm: 90, thigh: 92, shin: 92, foot: 182 },
      { torso: -90, upperArm: 30, forearm: 90, thigh: 92, shin: 205, foot: 290 },
    ],
    timing: [1000, 300, 1500, 500],
    cues: ['Curl your heels to your glutes', 'Lower slowly, keep hips down'],
    highlights: [{ segment: 'thigh', from: 0.1, to: 0.95 }],
    muscles: ['Hamstrings', 'Calves'],
    equipment: { type: 'pad', joint: 'ankle', offset: { back: 0 } },
    props: flatBench(30, 133, 120),
  },
  'Leg Extension': {
    anchor: { joint: 'hip', at: { x: 92, y: 136 } },
    poses: [
      { torso: 186, upperArm: 10, forearm: 60, thigh: 90, shin: 4, foot: 90 },
      { torso: 186, upperArm: 10, forearm: 60, thigh: 90, shin: 86, foot: 176 },
    ],
    timing: [1000, 400, 1500, 500],
    cues: ['Kick up until your legs are straight', 'Lower under control'],
    highlights: [{ segment: 'thigh' }],
    muscles: ['Quads'],
    equipment: { type: 'pad', joint: 'ankle' },
    props: [...seat(80, 141, 52), backrest({ x: 84, y: 140 }, { x: 80, y: 88 })],
  },
  'Walking Lunge': {
    anchor: { joint: 'ankle', at: { x: 128, y: FEET } },
    poses: [
      { torso: 180, upperArm: 0, forearm: 0, thigh: 22, shin: -6, foot: 90, thigh2: -22, shin2: -24, foot2: 72 },
      { torso: 176, upperArm: 0, forearm: 0, thigh: 82, shin: -10, foot: 90, thigh2: -12, shin2: -84, foot2: 96 },
    ],
    timing: [1300, 250, 1000, 500],
    cues: ['Step and drop your back knee', 'Drive up through your front heel'],
    highlights: [{ segment: 'thigh' }, { joint: 'hip', radius: 8, back: 6 }],
    muscles: ['Quads', 'Glutes', 'Hamstrings'],
    equipment: { type: 'dumbbell', joint: 'wrist' },
  },
  'Hip Thrust': {
    anchor: { joint: 'ankle', at: { x: 150, y: FEET } },
    poses: [
      { torso: -104, upperArm: 20, forearm: 110, thigh: 118, shin: -14, foot: 90 },
      { torso: -86, upperArm: 20, forearm: 110, thigh: 92, shin: -6, foot: 90 },
    ],
    timing: [900, 500, 1300, 400],
    cues: ['Drive hips up, squeeze hard', 'Lower until hips nearly touch'],
    highlights: [{ joint: 'hip', radius: 10 }, { segment: 'thigh', from: 0, to: 0.5 }],
    muscles: ['Glutes', 'Hamstrings'],
    equipment: { type: 'barbell', joint: 'hip', offset: { back: -10 } },
    props: flatBench(30, 161, 56),
  },
  'Standing Calf Raise': {
    anchor: { joint: 'toe', at: { x: 104, y: FEET + 1 } },
    poses: [
      { torso: 180, upperArm: 0, forearm: 0, ...standingLegs },
      { torso: 180, upperArm: 0, forearm: 0, thigh: 0, shin: 0, foot: 48 },
    ],
    timing: [800, 600, 1200, 400],
    cues: ['Rise as high as you can', 'Lower for a full stretch'],
    highlights: [{ segment: 'shin', from: 0.1, to: 0.7 }],
    muscles: ['Calves'],
    equipment: { type: 'dumbbell', joint: 'wrist' },
  },

  // ------------------------------------------------------------------ Chest & push
  'Barbell Bench Press': {
    anchor: { joint: 'hip', at: { x: 128, y: 128 } },
    poses: [
      { torso: -90, upperArm: 178, forearm: 178, thigh: 62, shin: 2, foot: 90 },
      { torso: -90, upperArm: 62, forearm: 180, thigh: 62, shin: 2, foot: 90 },
    ],
    timing: [1500, 300, 900, 600],
    cues: ['Lower to your lower chest', 'Press up and slightly back'],
    highlights: [{ segment: 'torso', from: 0.6, to: 1 }, { segment: 'upperArm' }, { joint: 'shoulder', radius: 6 }],
    muscles: ['Chest', 'Triceps', 'Front delts'],
    equipment: { type: 'barbell', joint: 'wrist' },
    props: flatBench(52, 137, 96),
  },
  'Incline Dumbbell Press': {
    anchor: { joint: 'hip', at: { x: 122, y: 136 } },
    poses: [
      { torso: -128, upperArm: 172, forearm: 176, thigh: 76, shin: 2, foot: 90 },
      { torso: -128, upperArm: 72, forearm: 172, thigh: 76, shin: 2, foot: 90 },
    ],
    timing: [1500, 300, 900, 600],
    cues: ['Lower to your upper chest', 'Press up and together'],
    highlights: [{ segment: 'torso', from: 0.6, to: 1 }, { joint: 'shoulder', radius: 7 }, { segment: 'upperArm' }],
    muscles: ['Upper chest', 'Front delts', 'Triceps'],
    equipment: { type: 'dumbbell', joint: 'wrist' },
    props: [...seat(104, 144, 36), backrest({ x: 112, y: 142 }, { x: 70, y: 108 })],
  },
  Dip: {
    anchor: { joint: 'wrist', at: { x: 104, y: 96 } },
    poses: [
      { torso: 168, upperArm: 4, forearm: 2, thigh: 10, shin: -70, foot: 20 },
      { torso: 156, upperArm: -78, forearm: 14, thigh: 16, shin: -74, foot: 16 },
    ],
    timing: [1300, 250, 900, 500],
    cues: ['Lean forward, sink until elbows hit 90°', 'Press back up to lockout'],
    highlights: [{ segment: 'torso', from: 0.65, to: 1 }, { segment: 'upperArm' }],
    muscles: ['Chest', 'Triceps', 'Front delts'],
    props: [
      { kind: 'line', a: { x: 84, y: 100 }, b: { x: 132, y: 100 }, width: 5 },
      { kind: 'line', a: { x: 124, y: 100 }, b: { x: 124, y: GROUND_Y }, width: 5 },
    ],
  },
  'Cable Fly': {
    view: 'front',
    poses: [
      { arm: 128, elbow: -14 },
      { arm: -22, elbow: -6 },
    ],
    timing: [1100, 400, 1400, 400],
    cues: ['Hug down and across', 'Open slowly, feel the stretch'],
    highlights: ['chest', 'delts'],
    muscles: ['Chest', 'Front delts'],
    equipment: 'handle',
    cables: [
      { x: 16, y: 18 },
      { x: 184, y: 18 },
    ],
    props: [tower(16), tower(184)],
  },

  // ------------------------------------------------------------------ Back & pull
  'Pull-up': {
    anchor: { joint: 'wrist', at: { x: 104, y: 16 } },
    poses: [
      { torso: 180, upperArm: 178, forearm: 180, thigh: 8, shin: -42, foot: 48 },
      { torso: 186, upperArm: 28, forearm: 172, thigh: 14, shin: -42, foot: 48 },
    ],
    timing: [1000, 300, 1500, 500],
    cues: ['Pull your chest to the bar', 'Lower all the way down'],
    highlights: [{ segment: 'torso', from: 0.45, to: 0.9 }, { segment: 'upperArm', from: 0.2, to: 0.9 }],
    muscles: ['Lats', 'Biceps', 'Rear delts'],
    props: pullupBar(104, 16),
  },
  'Lat Pulldown': {
    anchor: { joint: 'hip', at: { x: 96, y: 142 } },
    poses: [
      { torso: 188, upperArm: 176, forearm: 178, thigh: 90, shin: 2, foot: 90 },
      { torso: 196, upperArm: -14, forearm: 158, thigh: 90, shin: 2, foot: 90 },
    ],
    timing: [1000, 300, 1400, 500],
    cues: ['Pull the bar to your upper chest', 'Let your arms stretch back up'],
    highlights: [{ segment: 'torso', from: 0.45, to: 0.9 }, { segment: 'upperArm', from: 0.2, to: 0.9 }],
    muscles: ['Lats', 'Biceps', 'Rear delts'],
    equipment: { type: 'handle', joint: 'wrist' },
    cable: { from: { x: 108, y: 10 }, joint: 'wrist' },
    props: [...seat(80, 147, 36), { kind: 'rect', x: 118, y: 125, w: 14, h: 7 }],
  },
  'Barbell Row': {
    anchor: stand(),
    poses: [
      { torso: 108, upperArm: 2, forearm: 0, thigh: 18, shin: -10, foot: 90 },
      { torso: 108, upperArm: -58, forearm: 4, thigh: 18, shin: -10, foot: 90 },
    ],
    timing: [900, 300, 1300, 500],
    cues: ['Row the bar to your belly', 'Lower with control, back flat'],
    highlights: [{ segment: 'torso', from: 0.45, to: 1 }, { joint: 'shoulder', radius: 6 }],
    muscles: ['Lats', 'Upper back', 'Rear delts'],
    equipment: { type: 'barbell', joint: 'wrist' },
  },
  'Seated Cable Row': {
    anchor: { joint: 'hip', at: { x: 62, y: 158 } },
    poses: [
      { torso: 168, upperArm: 94, forearm: 92, thigh: 82, shin: 98, foot: 180 },
      { torso: 186, upperArm: -42, forearm: 92, thigh: 82, shin: 98, foot: 180 },
    ],
    timing: [900, 400, 1400, 500],
    cues: ['Pull to your belly, chest proud', 'Reach forward slowly'],
    highlights: [{ segment: 'torso', from: 0.4, to: 1 }, { joint: 'shoulder', radius: 6 }],
    muscles: ['Lats', 'Mid back', 'Rear delts'],
    equipment: { type: 'handle', joint: 'wrist' },
    cable: { from: { x: 184, y: 128 }, joint: 'wrist' },
    props: [...seat(40, 163, 50), { kind: 'line', a: { x: 152, y: 150 }, b: { x: 152, y: GROUND_Y }, width: 5 }, tower(184)],
  },
  'Face Pull': {
    anchor: stand(84),
    poses: [
      { torso: 182, upperArm: 96, forearm: 96, ...standingLegs },
      { torso: 184, upperArm: 122, forearm: 262, ...standingLegs },
    ],
    timing: [900, 400, 1300, 400],
    cues: ['Pull to your face, elbows high', 'Return slowly, arms long'],
    highlights: [{ joint: 'shoulder', radius: 7 }, { segment: 'torso', from: 0.75, to: 1 }],
    muscles: ['Rear delts', 'Traps'],
    equipment: { type: 'handle', joint: 'wrist' },
    cable: { from: { x: 184, y: 54 }, joint: 'wrist' },
    props: [tower(184)],
  },
  'Rear Delt Fly': {
    view: 'back',
    poses: [
      { arm: 10, elbow: 6 },
      { arm: 90, elbow: 8 },
    ],
    timing: [900, 400, 1300, 400],
    cues: ['Sweep your arms out wide', 'Lower slowly'],
    highlights: ['delts', 'upperBack'],
    muscles: ['Rear delts', 'Traps'],
    equipment: 'dumbbell',
  },
  'Hanging Leg Raise': {
    anchor: { joint: 'wrist', at: { x: 92, y: 16 } },
    poses: [
      { torso: 180, upperArm: 178, forearm: 180, thigh: 4, shin: -6, foot: 70 },
      { torso: 176, upperArm: 178, forearm: 180, thigh: 98, shin: 92, foot: 160 },
    ],
    timing: [1100, 300, 1400, 500],
    cues: ['Raise your legs, no swinging', 'Lower slowly'],
    highlights: [{ segment: 'torso', from: 0.05, to: 0.55 }],
    muscles: ['Abs', 'Obliques'],
    props: pullupBar(92, 16),
  },

  // ------------------------------------------------------------------ Shoulders
  'Overhead Press': {
    anchor: stand(),
    poses: [
      { torso: 180, upperArm: 28, forearm: 168, ...standingLegs },
      { torso: 182, upperArm: 176, forearm: 178, ...standingLegs },
    ],
    timing: [1000, 300, 1300, 500],
    cues: ['Press straight overhead', 'Lower to your collarbone'],
    highlights: [{ joint: 'shoulder', radius: 8 }, { segment: 'upperArm' }],
    muscles: ['Front delts', 'Side delts', 'Triceps'],
    equipment: { type: 'barbell', joint: 'wrist' },
  },
  'Dumbbell Shoulder Press': {
    anchor: { joint: 'hip', at: { x: 96, y: 140 } },
    poses: [
      { torso: 182, upperArm: 36, forearm: 168, thigh: 90, shin: 0, foot: 90 },
      { torso: 182, upperArm: 176, forearm: 178, thigh: 90, shin: 0, foot: 90 },
    ],
    timing: [1000, 300, 1300, 500],
    cues: ['Press up until arms are straight', 'Lower to ear height'],
    highlights: [{ joint: 'shoulder', radius: 8 }, { segment: 'upperArm' }],
    muscles: ['Front delts', 'Side delts', 'Triceps'],
    equipment: { type: 'dumbbell', joint: 'wrist' },
    props: [...seat(76, 145, 40), backrest({ x: 84, y: 144 }, { x: 82, y: 82 })],
  },
  'Lateral Raise': {
    view: 'front',
    poses: [
      { arm: 12, elbow: 6 },
      { arm: 88, elbow: 6 },
    ],
    timing: [900, 300, 1400, 400],
    cues: ['Raise out to shoulder height', 'Lower slowly'],
    highlights: ['delts'],
    muscles: ['Side delts', 'Traps'],
    equipment: 'dumbbell',
  },

  // ------------------------------------------------------------------ Arms
  'Barbell Curl': {
    anchor: stand(),
    poses: [
      { torso: 180, upperArm: 4, forearm: 8, ...standingLegs },
      { torso: 180, upperArm: 10, forearm: 158, ...standingLegs },
    ],
    timing: [1000, 300, 1500, 500],
    cues: ['Curl up, elbows pinned', 'Lower slowly under control'],
    highlights: [{ segment: 'upperArm', from: 0.15, to: 0.95 }, { segment: 'forearm', from: 0, to: 0.45 }],
    muscles: ['Biceps', 'Forearms'],
    equipment: { type: 'barbell', joint: 'wrist' },
  },
  'Hammer Curl': {
    anchor: stand(),
    poses: [
      { torso: 180, upperArm: 2, forearm: 4, ...standingLegs },
      { torso: 180, upperArm: 8, forearm: 150, ...standingLegs },
    ],
    timing: [1000, 300, 1500, 500],
    cues: ['Thumbs up, curl to your shoulder', 'Lower all the way down'],
    highlights: [{ segment: 'upperArm', from: 0.15, to: 0.95 }, { segment: 'forearm', from: 0, to: 0.7 }],
    muscles: ['Biceps', 'Forearms'],
    equipment: { type: 'dumbbell', joint: 'wrist' },
  },
  'Triceps Pushdown': {
    anchor: stand(84),
    poses: [
      { torso: 172, upperArm: 6, forearm: 150, ...standingLegs },
      { torso: 172, upperArm: 6, forearm: 8, ...standingLegs },
    ],
    timing: [800, 400, 1300, 400],
    cues: ['Push down until arms lock out', 'Let it rise, elbows pinned'],
    highlights: [{ segment: 'upperArm', from: 0.1, to: 0.95 }],
    muscles: ['Triceps'],
    equipment: { type: 'handle', joint: 'wrist' },
    cable: { from: { x: 128, y: 14 }, joint: 'wrist' },
    props: [tower(140)],
  },
  'Skull Crusher': {
    anchor: { joint: 'hip', at: { x: 128, y: 128 } },
    poses: [
      { torso: -90, upperArm: 172, forearm: 176, thigh: 62, shin: 2, foot: 90 },
      { torso: -90, upperArm: 160, forearm: -66, thigh: 62, shin: 2, foot: 90 },
    ],
    timing: [1400, 300, 900, 500],
    cues: ['Bend at the elbows to your forehead', 'Extend up, upper arms still'],
    highlights: [{ segment: 'upperArm', from: 0.1, to: 0.95 }],
    muscles: ['Triceps'],
    equipment: { type: 'barbell', joint: 'wrist' },
    props: flatBench(52, 137, 96),
  },
  'Overhead Triceps Extension': {
    anchor: stand(108),
    poses: [
      { torso: 166, upperArm: 160, forearm: -24, ...standingLegs },
      { torso: 166, upperArm: 160, forearm: 156, ...standingLegs },
    ],
    timing: [900, 400, 1400, 400],
    cues: ['Extend overhead, elbows in', 'Lower behind your head'],
    highlights: [{ segment: 'upperArm', from: 0.1, to: 0.95 }],
    muscles: ['Triceps'],
    equipment: { type: 'handle', joint: 'wrist' },
    cable: { from: { x: 30, y: 150 }, joint: 'wrist' },
    props: [tower(22)],
  },

  // ------------------------------------------------------------------ Core
  Plank: {
    anchor: { joint: 'toe', at: { x: 30, y: GROUND_Y - 1 } },
    poses: [
      { torso: 98, upperArm: 0, forearm: 90, thigh: -82, shin: -82, foot: 0 },
      { torso: 101, upperArm: 2, forearm: 90, thigh: -79, shin: -80, foot: 0 },
    ],
    timing: [1600, 400, 1600, 400],
    cues: ['Squeeze glutes, brace your abs', 'Keep one straight line'],
    highlights: [{ segment: 'torso', from: 0.05, to: 0.55 }],
    muscles: ['Abs', 'Obliques', 'Front delts'],
  },
};

export const getDemo = (exerciseName: string): DemoSpec | undefined => DEMOS[exerciseName];
