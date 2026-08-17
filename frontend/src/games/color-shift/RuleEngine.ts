import type { ActiveRule, LevelConfig, ObjectColor, Shape } from "./Types";
const colors: ObjectColor[] = ["blue", "red", "green", "yellow"];
const shapes: Shape[] = ["circle", "square", "triangle", "diamond"];
export const matchesRule = (color: ObjectColor, shape: Shape, rule: ActiveRule) =>
  (rule.type === "color" && color === rule.targetColor) ||
  (rule.type === "shape" && shape === rule.targetShape) ||
  (rule.type === "colorAndShape" && color === rule.targetColor && shape === rule.targetShape);
export function nextRule(level: LevelConfig, previous?: ActiveRule): ActiveRule {
  const color = colors.filter((v) => v !== previous?.targetColor)[Math.floor(Math.random() * (colors.length - (previous?.targetColor ? 1 : 0)))];
  const shape = shapes.filter((v) => v !== previous?.targetShape)[Math.floor(Math.random() * (shapes.length - (previous?.targetShape ? 1 : 0)))];
  return { type: level.ruleType, targetColor: color, targetShape: shape };
}
export const switchDelay = (difficulty: number) => Math.max(10500, 20500 - difficulty * 1250 + (Math.random() * 5000 - 2500));
