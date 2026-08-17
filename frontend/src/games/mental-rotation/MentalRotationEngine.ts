import type { RotationChallenge, RotationShape } from "./Types";

export const SAFE_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315];
export const MATCH_TOLERANCE = 12;

const SHAPES: RotationShape[] = ["key", "plane", "chair", "boot", "rocket"];

export const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

export const angularDifference = (a: number, b: number) => {
  const difference = Math.abs(normalizeRotation(a) - normalizeRotation(b));
  return Math.min(difference, 360 - difference);
};

export const isOrientationMatch = (
  current: number,
  target: number,
  tolerance = MATCH_TOLERANCE,
) => angularDifference(current, target) <= tolerance;

export const createChallenges = (): RotationChallenge[] =>
  Array.from({ length: 15 }, (_, index) => {
    const level = Math.min(5, Math.floor(index / 3) + 1);
    const targetIndex = (index * 3 + level) % SAFE_ROTATIONS.length;
    const offsetSteps = Math.min(4, 1 + Math.floor(level / 2));
    return {
      id: index + 1,
      level,
      shape: SHAPES[(index + level - 1) % SHAPES.length],
      targetRotation: SAFE_ROTATIONS[targetIndex],
      startRotation:
        SAFE_ROTATIONS[(targetIndex + offsetSteps) % SAFE_ROTATIONS.length],
    };
  });

export const shortestRequiredRotation = (start: number, target: number) =>
  angularDifference(start, target);
