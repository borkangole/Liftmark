import type { Muscle } from './targets';

/**
 * Original body map drawn on a 120×220 grid per view (front and back).
 * Shapes are defined for the figure's left half and mirrored across x = 60.
 *
 * - `muscles`: which muscles a shape belongs to. Lit when the exercise targets them.
 * - `base`: silhouette pieces drawn underneath; the gaps between muscles show through as definition lines.
 * - `detail`: anatomical detail that's never highlighted (e.g. tibialis), drawn in the idle colour.
 */
export type Geometry =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: 'path'; d: string }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number };

export type BodyShape = Geometry & { muscles: Muscle[]; base?: true; detail?: true };

const base = (g: Geometry): BodyShape => ({ ...g, muscles: [], base: true });
const detail = (g: Geometry): BodyShape => ({ ...g, muscles: [], detail: true });

/** Silhouette shared by both views. */
const SILHOUETTE: BodyShape[] = [
  base({ kind: 'ellipse', cx: 60, cy: 16, rx: 10, ry: 12.5 }),
  base({ kind: 'rect', x: 53, y: 25, w: 7, h: 13, r: 1 }),
  base({ kind: 'path', d: 'M60 33 L50 35 L38 38.5 Q30.5 41.5 30.5 50 L32.5 62 L39.5 66 L42 84 L43 97 L40.5 108 L60 113 Z' }),
  base({ kind: 'path', d: 'M34 41 Q26.5 49 25.5 62 Q24.5 74 26.5 81 L36 81 Q38 70 38 57 Z' }),
  base({ kind: 'path', d: 'M26.5 79 Q20.5 88 19.5 100 L22 107 L28 107 Q31 96 35 80 Z' }),
  base({ kind: 'ellipse', cx: 23.5, cy: 112, rx: 4.6, ry: 7, rotate: 10 }),
  base({ kind: 'path', d: 'M40.5 103 Q35.5 118 36.5 135 Q37.5 150 41 159 L56.5 159 Q59.5 140 59.5 112 L60 110 Z' }),
  base({ kind: 'ellipse', cx: 48.5, cy: 161.5, rx: 6.5, ry: 5.5 }),
  base({ kind: 'path', d: 'M41.5 164 Q38.5 178 40.5 192 L43.5 203 L52.5 203 Q55.5 185 55.5 165 Z' }),
  base({ kind: 'ellipse', cx: 47, cy: 207, rx: 6.5, ry: 3.5 }),
];

export const FRONT: BodyShape[] = [
  ...SILHOUETTE,
  // Neck and shoulders
  { kind: 'path', d: 'M55.5 30 Q50.5 35 43.5 37.4 L55.5 38.8 Z', muscles: ['traps'] },
  { kind: 'path', d: 'M43 39 Q35 39 33.5 47 L35.5 54.5 Q37.5 47 42.5 43 Z', muscles: ['frontDelts'] },
  { kind: 'ellipse', cx: 31.6, cy: 48.5, rx: 3.4, ry: 7.6, rotate: 12, muscles: ['sideDelts'] },
  // Chest: clavicular and sternal heads
  { kind: 'path', d: 'M58.6 38.6 L44.5 39.6 Q39.5 42 38.8 46 L58.6 46 Z', muscles: ['chest'] },
  { kind: 'path', d: 'M58.6 47.2 L38.8 47.2 Q38.4 54 42.2 58.2 Q50 62.4 58.6 59.4 Z', muscles: ['chest'] },
  // Serratus
  { kind: 'ellipse', cx: 41.8, cy: 62.5, rx: 2.6, ry: 1.7, rotate: -28, muscles: ['serratus'] },
  { kind: 'ellipse', cx: 42.3, cy: 67, rx: 2.6, ry: 1.7, rotate: -28, muscles: ['serratus'] },
  { kind: 'ellipse', cx: 42.8, cy: 71.5, rx: 2.4, ry: 1.6, rotate: -28, muscles: ['serratus'] },
  // Arms: biceps, brachialis, forearm
  { kind: 'ellipse', cx: 31.8, cy: 64.5, rx: 4.3, ry: 10.5, rotate: 8, muscles: ['biceps'] },
  { kind: 'ellipse', cx: 27.9, cy: 71, rx: 1.9, ry: 6, rotate: 12, muscles: ['biceps'] },
  { kind: 'ellipse', cx: 28.6, cy: 86, rx: 3.6, ry: 9, rotate: 22, muscles: ['forearms'] },
  { kind: 'ellipse', cx: 24.4, cy: 93.5, rx: 3, ry: 10, rotate: 14, muscles: ['forearms'] },
  // Core
  { kind: 'rect', x: 53.2, y: 61.5, w: 5.8, h: 7, r: 2, muscles: ['abs'] },
  { kind: 'rect', x: 53.2, y: 70, w: 5.8, h: 7, r: 2, muscles: ['abs'] },
  { kind: 'rect', x: 53.2, y: 78.5, w: 5.8, h: 7, r: 2, muscles: ['abs'] },
  { kind: 'path', d: 'M53.2 87 L59 87 L59 99 Q55.5 98 53.2 93 Z', muscles: ['abs'] },
  { kind: 'path', d: 'M51.6 61 Q45.5 66 44.2 78 Q44.5 90 47.5 96.5 L51.6 97.5 Z', muscles: ['obliques'] },
  // Thighs: vastus lateralis, rectus femoris, vastus medialis, adductors
  { kind: 'ellipse', cx: 42.2, cy: 131, rx: 4.4, ry: 20.5, rotate: 7, muscles: ['quads'] }, // vastus lateralis
  { kind: 'ellipse', cx: 48.6, cy: 128.5, rx: 4.2, ry: 21, rotate: 2, muscles: ['quads'] }, // rectus femoris
  { kind: 'ellipse', cx: 53.8, cy: 146.5, rx: 3.5, ry: 8.5, rotate: -10, muscles: ['quads'] }, // vastus medialis
  { kind: 'ellipse', cx: 55.8, cy: 121, rx: 2.9, ry: 12.5, rotate: -8, muscles: ['adductors'] },
  // Lower legs
  detail({ kind: 'ellipse', cx: 45.6, cy: 178, rx: 2.8, ry: 13, rotate: -4 }),
  { kind: 'ellipse', cx: 51.8, cy: 176.5, rx: 3.3, ry: 11, rotate: -4, muscles: ['calves'] },
];

export const BACK: BodyShape[] = [
  ...SILHOUETTE,
  // Traps: upper, then middle/lower
  { kind: 'path', d: 'M59 29.5 L52 33.5 L43 39.2 L52 41.2 L59 43.5 Z', muscles: ['traps'] },
  { kind: 'path', d: 'M59 44.8 L51.6 42.4 L49.6 51 L59 74 Z', muscles: ['traps'] },
  // Shoulders and rotator cuff
  { kind: 'ellipse', cx: 34.8, cy: 45, rx: 5.4, ry: 6.8, rotate: 28, muscles: ['rearDelts'] },
  { kind: 'ellipse', cx: 31.2, cy: 50.5, rx: 3.1, ry: 6.8, rotate: 10, muscles: ['sideDelts'] },
  { kind: 'path', d: 'M50.4 42.6 Q44 42.4 40.4 47.4 Q43.4 54 49.4 54.2 Z', muscles: ['rearDelts'] },
  { kind: 'ellipse', cx: 43.4, cy: 57.4, rx: 5, ry: 2.6, rotate: 22, muscles: ['lats'] },
  // Lats and spinal erectors
  { kind: 'path', d: 'M49 56.4 Q41.2 60 41 70 Q42 84 48.8 94.4 L56.4 96.6 L57.2 78 Z', muscles: ['lats'] },
  { kind: 'rect', x: 53.6, y: 75.5, w: 4.8, h: 26.5, r: 2.4, muscles: ['lowerBack'] },
  // Arms: triceps long and lateral heads, forearm extensors
  { kind: 'ellipse', cx: 32.4, cy: 64.5, rx: 3.9, ry: 10.2, rotate: 10, muscles: ['triceps'] },
  { kind: 'ellipse', cx: 28.4, cy: 61.5, rx: 2.5, ry: 8, rotate: 14, muscles: ['triceps'] },
  { kind: 'ellipse', cx: 28.6, cy: 86, rx: 3.6, ry: 9, rotate: 22, muscles: ['forearms'] },
  { kind: 'ellipse', cx: 24.4, cy: 93.5, rx: 3, ry: 10, rotate: 14, muscles: ['forearms'] },
  // Glutes: medius and maximus
  { kind: 'ellipse', cx: 45.2, cy: 102.6, rx: 4.6, ry: 3.2, rotate: -24, muscles: ['glutes'] },
  { kind: 'path', d: 'M58.8 102.5 Q46.5 101 42.2 108.5 Q41.2 118.5 48 121.5 Q55.8 122 58.8 117.5 Z', muscles: ['glutes'] },
  // Hamstrings: biceps femoris, semitendinosus; adductor magnus glimpse
  { kind: 'ellipse', cx: 45.4, cy: 139.5, rx: 4.3, ry: 16.5, rotate: 3, muscles: ['hamstrings'] },
  { kind: 'ellipse', cx: 53.4, cy: 138.5, rx: 4, ry: 16.5, rotate: -3, muscles: ['hamstrings'] },
  { kind: 'ellipse', cx: 57.4, cy: 128, rx: 1.6, ry: 6.5, muscles: ['adductors'] },
  // Calves: gastrocnemius heads, soleus
  { kind: 'ellipse', cx: 45, cy: 175, rx: 4.2, ry: 11, rotate: 3, muscles: ['calves'] },
  { kind: 'ellipse', cx: 52, cy: 175.5, rx: 4.6, ry: 12, rotate: -3, muscles: ['calves'] },
  { kind: 'ellipse', cx: 48.4, cy: 191, rx: 4.6, ry: 4.4, muscles: ['calves'] },
];

export type ShapeState = 'primary' | 'secondary' | 'idle' | 'structure';

export function shapeState(
  shape: { muscles: Muscle[]; base?: boolean; detail?: boolean },
  primary: Muscle[],
  secondary: Muscle[],
): ShapeState {
  if (shape.base) return 'structure';
  if (shape.detail || shape.muscles.length === 0) return 'idle';
  if (shape.muscles.some((m) => primary.includes(m))) return 'primary';
  if (shape.muscles.some((m) => secondary.includes(m))) return 'secondary';
  return 'idle';
}

// ---------------------------------------------------------------------------------------------
// Flattening: every shape becomes a plain path, with the mirrored half computed here, so the map
// renders identically everywhere (no nested or rotated SVG transforms).
// ---------------------------------------------------------------------------------------------

const CENTER = 60;
const f = (n: number) => Number(n.toFixed(2));

function ellipseToPath(cx: number, cy: number, rx: number, ry: number, rotateDeg = 0, steps = 36) {
  const rot = (rotateDeg * Math.PI) / 180;
  const pts = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    return `${f(cx + x * Math.cos(rot) - y * Math.sin(rot))} ${f(cy + x * Math.sin(rot) + y * Math.cos(rot))}`;
  });
  return `M${pts.join(' L')} Z`;
}

function rectToPath(x: number, y: number, w: number, h: number, r: number) {
  return [
    `M${f(x + r)} ${f(y)}`,
    `L${f(x + w - r)} ${f(y)}`,
    `Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}`,
    `L${f(x + w)} ${f(y + h - r)}`,
    `Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}`,
    `L${f(x + r)} ${f(y + h)}`,
    `Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}`,
    `L${f(x)} ${f(y + r)}`,
    `Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}`,
    'Z',
  ].join(' ');
}

/** Mirrors an absolute-coordinate path (M/L/Q/Z) across the body's center line. */
export function mirrorPath(d: string) {
  return d.replace(/([MLQ])([^MLQZ]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const out = nums.map((n, i) => (i % 2 === 0 ? f(2 * CENTER - n) : n));
    return `${cmd}${out.join(' ')} `;
  });
}

function shapeToPath(s: BodyShape) {
  if (s.kind === 'ellipse') return ellipseToPath(s.cx, s.cy, s.rx, s.ry, s.rotate);
  if (s.kind === 'rect') return rectToPath(s.x, s.y, s.w, s.h, s.r);
  return s.d;
}

const isCentered = (s: BodyShape) => (s.kind === 'ellipse' && s.cx === CENTER) || (s.kind === 'rect' && s.x + s.w / 2 === CENTER);

export interface FlatShape {
  d: string;
  muscles: Muscle[];
  base?: true;
  detail?: true;
}

/** Both halves of a view as plain paths. */
export function flattenView(shapes: BodyShape[]): FlatShape[] {
  return shapes.flatMap((s) => {
    const d = shapeToPath(s);
    const meta = { muscles: s.muscles, base: s.base, detail: s.detail };
    return isCentered(s) ? [{ d, ...meta }] : [{ d, ...meta }, { d: mirrorPath(d), ...meta }];
  });
}

export const FRONT_FLAT = flattenView(FRONT);
export const BACK_FLAT = flattenView(BACK);
