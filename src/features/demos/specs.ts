import type { FrontPose, JointName, Point, Pose } from './kinematics';

export type Segment = 'torso' | 'upperArm' | 'forearm' | 'thigh' | 'shin';

/** A muscle to light up: part of a segment (0 = segment start, 1 = end) or a blob on a joint. */
export type Highlight =
  | { segment: Segment; from?: number; to?: number }
  | { joint: JointName; radius: number; back?: number };

export interface Equipment {
  type: 'barbell' | 'dumbbell' | 'handle' | 'pad';
  joint: JointName;
  /** Offset in the torso's frame: `back` is toward the figure's back, `up` along the spine. */
  offset?: { back?: number; up?: number };
}

/** Static scenery: benches, seats, bars, machine frames. */
export type Prop =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; a: Point; b: Point; width: number }
  | { kind: 'circle'; c: Point; r: number };

interface BaseSpec {
  /** ms for: start→end, hold at end, end→start, hold at start */
  timing: [number, number, number, number];
  /** Coaching cue shown during each moving phase. */
  cues: [string, string];
  muscles: string[];
  props?: Prop[];
}

export interface SideDemoSpec extends BaseSpec {
  view?: 'side';
  anchor: { joint: JointName; at: Point };
  /** [start pose, other end of the rep] */
  poses: [Pose, Pose];
  highlights: Highlight[];
  equipment?: Equipment;
  /** A cable from a fixed pulley to a joint (usually the wrist). */
  cable?: { from: Point; joint: JointName };
}

export type FrontHighlight = 'delts' | 'chest' | 'upperBack' | 'arms';

export interface FrontDemoSpec extends BaseSpec {
  view: 'front' | 'back';
  poses: [FrontPose, FrontPose];
  highlights: FrontHighlight[];
  equipment?: 'dumbbell' | 'handle';
  /** Pulleys the hands are attached to (left, right). */
  cables?: [Point, Point];
}

export type DemoSpec = SideDemoSpec | FrontDemoSpec;

export const isFront = (s: DemoSpec): s is FrontDemoSpec => s.view === 'front' || s.view === 'back';

export const GROUND_Y = 186;
