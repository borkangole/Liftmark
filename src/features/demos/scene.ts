import {
  direction,
  easeInOutCubic,
  lerpFrontPose,
  lerpPose,
  SEGMENT_LENGTH,
  solvePose,
  type Joints,
  type Point,
} from './kinematics';
import {
  GROUND_Y,
  isFront,
  type DemoSpec,
  type FrontDemoSpec,
  type Prop,
  type Segment,
  type SideDemoSpec,
} from './specs';

export type Tone = 'far' | 'near' | 'target' | 'glow' | 'equipment' | 'equipmentDark' | 'prop' | 'cable';

export interface SceneLine {
  kind: 'line';
  a: Point;
  b: Point;
  width: number;
  tone: Tone;
}
export interface SceneCircle {
  kind: 'circle';
  c: Point;
  r: number;
  tone: Tone;
}
export interface SceneRect {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  tone: Tone;
}
export type Shape = SceneLine | SceneCircle | SceneRect;

const WIDTH: Record<Segment, number> = { torso: 18, upperArm: 9, forearm: 8, thigh: 13, shin: 10 };
const SEGMENT_JOINTS: Record<Segment, [keyof Joints, keyof Joints]> = {
  torso: ['hip', 'shoulder'],
  upperArm: ['shoulder', 'elbow'],
  forearm: ['elbow', 'wrist'],
  thigh: ['hip', 'knee'],
  shin: ['knee', 'ankle'],
};
const FAR_OFFSET = { x: -3, y: -2 };

const shift = (p: Point, o: Point) => ({ x: p.x + o.x, y: p.y + o.y });
const along = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Where the rep is at time `ms`: which phase, and the eased 0→1 position between the two poses. */
export function repProgress(spec: DemoSpec, ms: number): { t: number; phase: 0 | 1 } {
  const [down, holdEnd, up, holdStart] = spec.timing;
  const cycle = down + holdEnd + up + holdStart;
  let m = ms % cycle;
  if (m < down) return { t: easeInOutCubic(m / down), phase: 0 };
  m -= down;
  if (m < holdEnd) return { t: 1, phase: 0 };
  m -= holdEnd;
  if (m < up) return { t: 1 - easeInOutCubic(m / up), phase: 1 };
  return { t: 0, phase: 1 };
}

function scenery(props: Prop[] | undefined, shapes: Shape[]) {
  shapes.push({ kind: 'rect', x: 10, y: GROUND_Y, w: 180, h: 2, tone: 'prop' });
  for (const p of props ?? []) {
    if (p.kind === 'rect') shapes.push({ kind: 'rect', x: p.x, y: p.y, w: p.w, h: p.h, tone: 'prop' });
    else if (p.kind === 'line') shapes.push({ kind: 'line', a: p.a, b: p.b, width: p.width, tone: 'prop' });
    else shapes.push({ kind: 'circle', c: p.c, r: p.r, tone: 'prop' });
  }
}

function equipmentShapes(type: 'barbell' | 'dumbbell' | 'handle' | 'pad', c: Point, shapes: Shape[]) {
  const r = { barbell: 14, dumbbell: 8, handle: 4, pad: 7 }[type];
  shapes.push({ kind: 'circle', c, r, tone: 'equipmentDark' });
  if (type === 'handle') return;
  shapes.push({ kind: 'circle', c, r: r - (type === 'pad' ? 2 : 4), tone: 'equipment' });
  if (type !== 'pad') shapes.push({ kind: 'circle', c, r: 2.5, tone: 'equipmentDark' });
}

/** Flat list of shapes (back to front) for a demo at rep position `t` (0 = start pose, 1 = end pose). */
export function buildScene(spec: DemoSpec, t: number): Shape[] {
  return isFront(spec) ? buildFrontScene(spec, t) : buildSideScene(spec, t);
}

function buildSideScene(spec: SideDemoSpec, t: number): Shape[] {
  const pose = lerpPose(spec.poses[0], spec.poses[1], t);
  const j = solvePose(pose, spec.anchor);
  const far = Object.fromEntries(Object.entries(j).map(([k, p]) => [k, shift(p, FAR_OFFSET)])) as Joints;
  const shapes: Shape[] = [];

  scenery(spec.props, shapes);

  const limb = (joints: Joints, seg: Segment, tone: Tone) => {
    const [a, b] = SEGMENT_JOINTS[seg];
    shapes.push({ kind: 'line', a: joints[a], b: joints[b], width: WIDTH[seg], tone });
  };

  // Cable behind everything on the body
  if (spec.cable) {
    shapes.push({ kind: 'line', a: spec.cable.from, b: j[spec.cable.joint], width: 1.5, tone: 'cable' });
    shapes.push({ kind: 'circle', c: spec.cable.from, r: 5, tone: 'equipmentDark' });
  }

  // Far-side limbs (behind the body). The far leg can have its own pose (lunges).
  shapes.push({ kind: 'line', a: far.hip, b: far.knee2, width: WIDTH.thigh, tone: 'far' });
  shapes.push({ kind: 'line', a: far.knee2, b: far.ankle2, width: WIDTH.shin, tone: 'far' });
  shapes.push({ kind: 'line', a: far.ankle2, b: far.toe2, width: 6, tone: 'far' });
  limb(far, 'upperArm', 'far');
  limb(far, 'forearm', 'far');

  // Body
  limb(j, 'torso', 'near');
  shapes.push({ kind: 'circle', c: j.head, r: SEGMENT_LENGTH.headRadius, tone: 'near' });
  limb(j, 'thigh', 'near');
  limb(j, 'shin', 'near');
  shapes.push({ kind: 'line', a: j.ankle, b: j.toe, width: 6, tone: 'near' });

  const highlight = (h: SideDemoSpec['highlights'][number]) => {
    if ('joint' in h) {
      const back = direction(pose.torso + 90);
      const c = { x: j[h.joint].x + back.x * (h.back ?? 0), y: j[h.joint].y + back.y * (h.back ?? 0) };
      shapes.push({ kind: 'circle', c, r: h.radius + 4, tone: 'glow' });
      shapes.push({ kind: 'circle', c, r: h.radius, tone: 'target' });
      return;
    }
    const [a, b] = SEGMENT_JOINTS[h.segment];
    const p1 = along(j[a], j[b], h.from ?? 0);
    const p2 = along(j[a], j[b], h.to ?? 1);
    shapes.push({ kind: 'line', a: p1, b: p2, width: WIDTH[h.segment] + 7, tone: 'glow' });
    shapes.push({ kind: 'line', a: p1, b: p2, width: WIDTH[h.segment] - 1, tone: 'target' });
  };
  const isArm = (h: SideDemoSpec['highlights'][number]) =>
    'segment' in h && (h.segment === 'upperArm' || h.segment === 'forearm');
  spec.highlights.filter((h) => !isArm(h)).forEach(highlight);

  // Near arm on top, then its muscles
  limb(j, 'upperArm', 'near');
  limb(j, 'forearm', 'near');
  spec.highlights.filter(isArm).forEach(highlight);

  if (spec.equipment) {
    const back = direction(pose.torso + 90);
    const up = direction(pose.torso);
    const o = spec.equipment.offset ?? {};
    const base = j[spec.equipment.joint];
    const c = {
      x: base.x + back.x * (o.back ?? 0) + up.x * (o.up ?? 0),
      y: base.y + back.y * (o.back ?? 0) + up.y * (o.up ?? 0),
    };
    equipmentShapes(spec.equipment.type, c, shapes);
  }

  return shapes;
}

// ---------------------------------------------------------------------------------------------
// Front / back view
// ---------------------------------------------------------------------------------------------

const CX = 100;
const FRONT = {
  head: { x: CX, y: 46 },
  neck: { x: CX, y: 58 },
  pelvis: { x: CX, y: 112 },
  shoulderX: 17,
  shoulderY: 66,
  hipX: 9,
  upperArm: 28,
  forearm: 26,
  thigh: 38,
  shin: 36,
};

function buildFrontScene(spec: FrontDemoSpec, t: number): Shape[] {
  const pose = lerpFrontPose(spec.poses[0], spec.poses[1], t);
  const shapes: Shape[] = [];
  scenery(spec.props, shapes);
  const F = FRONT;
  const lit = (h: FrontDemoSpec['highlights'][number]) => spec.highlights.includes(h);

  const arms = ([-1, 1] as const).map((side) => {
    const shoulder = { x: CX + side * F.shoulderX, y: F.shoulderY };
    // Mirror: the left arm swings left (negative x), the right arm right.
    const upper = direction(side * pose.arm);
    const elbow = { x: shoulder.x + upper.x * F.upperArm, y: shoulder.y + upper.y * F.upperArm };
    const fore = direction(side * (pose.arm + pose.elbow));
    const wrist = { x: elbow.x + fore.x * F.forearm, y: elbow.y + fore.y * F.forearm };
    return { shoulder, elbow, wrist };
  });

  if (spec.cables) {
    arms.forEach((a, i) => {
      shapes.push({ kind: 'line', a: spec.cables![i], b: a.wrist, width: 1.5, tone: 'cable' });
      shapes.push({ kind: 'circle', c: spec.cables![i], r: 5, tone: 'equipmentDark' });
    });
  }

  // Legs
  for (const side of [-1, 1]) {
    const hip = { x: CX + side * F.hipX, y: F.pelvis.y };
    const knee = { x: hip.x + side * 1.5, y: hip.y + F.thigh };
    const ankle = { x: knee.x, y: knee.y + F.shin };
    shapes.push({ kind: 'line', a: hip, b: knee, width: 13, tone: 'near' });
    shapes.push({ kind: 'line', a: knee, b: ankle, width: 10, tone: 'near' });
    shapes.push({ kind: 'line', a: ankle, b: { x: ankle.x + side * 5, y: GROUND_Y - 1 }, width: 6, tone: 'near' });
  }

  // Torso (a tapered column) and head
  shapes.push({ kind: 'line', a: { x: CX, y: F.pelvis.y - 4 }, b: { x: CX, y: F.shoulderY + 2 }, width: 26, tone: 'near' });
  shapes.push({ kind: 'line', a: { x: CX - F.shoulderX + 4, y: F.shoulderY }, b: { x: CX + F.shoulderX - 4, y: F.shoulderY }, width: 12, tone: 'near' });
  shapes.push({ kind: 'line', a: F.neck, b: { x: CX, y: F.shoulderY }, width: 7, tone: 'near' });
  shapes.push({ kind: 'circle', c: F.head, r: 10, tone: 'near' });

  if (lit('chest') || lit('upperBack')) {
    for (const side of [-1, 1]) {
      const c = { x: CX + side * 6, y: F.shoulderY + 9 };
      shapes.push({ kind: 'circle', c, r: 10, tone: 'glow' });
      shapes.push({ kind: 'circle', c, r: 6.5, tone: 'target' });
    }
  }

  // Arms
  for (const a of arms) {
    shapes.push({ kind: 'line', a: a.shoulder, b: a.elbow, width: 9, tone: 'near' });
    shapes.push({ kind: 'line', a: a.elbow, b: a.wrist, width: 8, tone: 'near' });
    if (lit('arms')) {
      shapes.push({ kind: 'line', a: a.shoulder, b: a.elbow, width: 15, tone: 'glow' });
      shapes.push({ kind: 'line', a: a.shoulder, b: a.elbow, width: 8, tone: 'target' });
    }
    if (lit('delts')) {
      shapes.push({ kind: 'circle', c: a.shoulder, r: 10, tone: 'glow' });
      shapes.push({ kind: 'circle', c: a.shoulder, r: 6.5, tone: 'target' });
    }
    if (spec.equipment) equipmentShapes(spec.equipment, a.wrist, shapes);
  }

  return shapes;
}
