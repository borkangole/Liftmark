/**
 * Side-view stick-figure kinematics for exercise demos.
 * Angles are absolute, in degrees: 0 points straight down, 90 points right (the way the figure faces),
 * 180 points up, -90 points left.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Pose {
  torso: number; // hip → shoulder
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
  foot: number;
  /** Far leg, when it differs from the near leg (lunges). Defaults to the near leg. */
  thigh2?: number;
  shin2?: number;
  foot2?: number;
}

export type JointName =
  | 'hip'
  | 'shoulder'
  | 'head'
  | 'elbow'
  | 'wrist'
  | 'knee'
  | 'ankle'
  | 'toe'
  | 'knee2'
  | 'ankle2'
  | 'toe2';
export type Joints = Record<JointName, Point>;

/** Body proportions on the 200×200 stage (scaled so overhead lifts still fit). */
const BODY_SCALE = 0.88;
export const SEGMENT_LENGTH = {
  torso: 50 * BODY_SCALE,
  neck: 9 * BODY_SCALE,
  headRadius: 9 * BODY_SCALE,
  upperArm: 28 * BODY_SCALE,
  forearm: 26 * BODY_SCALE,
  thigh: 40 * BODY_SCALE,
  shin: 38 * BODY_SCALE,
  foot: 13 * BODY_SCALE,
};

export const direction = (deg: number): Point => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};

const step = (from: Point, deg: number, length: number): Point => {
  const d = direction(deg);
  return { x: from.x + d.x * length, y: from.y + d.y * length };
};

/** Forward kinematics, then translate so `anchor.joint` sits exactly at `anchor.at`. */
export function solvePose(pose: Pose, anchor: { joint: JointName; at: Point }): Joints {
  const L = SEGMENT_LENGTH;
  const hip = { x: 0, y: 0 };
  const shoulder = step(hip, pose.torso, L.torso);
  const head = step(shoulder, pose.torso, L.neck + L.headRadius);
  const elbow = step(shoulder, pose.upperArm, L.upperArm);
  const wrist = step(elbow, pose.forearm, L.forearm);
  const knee = step(hip, pose.thigh, L.thigh);
  const ankle = step(knee, pose.shin, L.shin);
  const toe = step(ankle, pose.foot, L.foot);
  const knee2 = step(hip, pose.thigh2 ?? pose.thigh, L.thigh);
  const ankle2 = step(knee2, pose.shin2 ?? pose.shin, L.shin);
  const toe2 = step(ankle2, pose.foot2 ?? pose.foot, L.foot);
  const joints: Joints = { hip, shoulder, head, elbow, wrist, knee, ankle, toe, knee2, ankle2, toe2 };

  const dx = anchor.at.x - joints[anchor.joint].x;
  const dy = anchor.at.y - joints[anchor.joint].y;
  for (const k of Object.keys(joints) as JointName[]) {
    joints[k] = { x: joints[k].x + dx, y: joints[k].y + dy };
  }
  return joints;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    torso: lerp(a.torso, b.torso, t),
    upperArm: lerp(a.upperArm, b.upperArm, t),
    forearm: lerp(a.forearm, b.forearm, t),
    thigh: lerp(a.thigh, b.thigh, t),
    shin: lerp(a.shin, b.shin, t),
    foot: lerp(a.foot, b.foot, t),
    thigh2: lerp(a.thigh2 ?? a.thigh, b.thigh2 ?? b.thigh, t),
    shin2: lerp(a.shin2 ?? a.shin, b.shin2 ?? b.shin, t),
    foot2: lerp(a.foot2 ?? a.foot, b.foot2 ?? b.foot, t),
  };
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ---------------------------------------------------------------------------------------------
// Front view (for movements in the frontal plane: lateral raises, flies)
// ---------------------------------------------------------------------------------------------

/** Symmetric front/back-view pose. `arm` is abduction from hanging (0) to overhead (180); negative crosses in. */
export interface FrontPose {
  arm: number;
  /** Elbow bend, added to the arm angle; positive bends the forearm upward/inward. */
  elbow: number;
}

export const lerpFrontPose = (a: FrontPose, b: FrontPose, t: number): FrontPose => ({
  arm: lerp(a.arm, b.arm, t),
  elbow: lerp(a.elbow, b.elbow, t),
});
