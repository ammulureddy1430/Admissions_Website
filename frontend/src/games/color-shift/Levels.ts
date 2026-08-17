import type { LevelConfig } from "./Types";
export const LEVELS: LevelConfig[] = [
  { difficulty: 1, ruleType: "color", speed: 65, spawnMs: 1450, distractorRatio: .38, maxObjects: 4 },
  { difficulty: 2, ruleType: "color", speed: 74, spawnMs: 1270, distractorRatio: .46, maxObjects: 5 },
  { difficulty: 3, ruleType: "shape", speed: 82, spawnMs: 1120, distractorRatio: .52, maxObjects: 6 },
  { difficulty: 4, ruleType: "shape", speed: 90, spawnMs: 990, distractorRatio: .56, maxObjects: 7 },
  { difficulty: 5, ruleType: "colorAndShape", speed: 96, spawnMs: 900, distractorRatio: .62, maxObjects: 7 },
  { difficulty: 6, ruleType: "colorAndShape", speed: 104, spawnMs: 820, distractorRatio: .66, maxObjects: 8 },
];
export const levelFor = (elapsed: number, accuracy: number) => LEVELS[Math.min(5, Math.max(0, Math.floor(elapsed / 20) + (elapsed > 35 && accuracy > .78 ? 1 : 0)))];
