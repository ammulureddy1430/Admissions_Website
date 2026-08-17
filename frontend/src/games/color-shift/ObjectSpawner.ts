import { matchesRule } from "./RuleEngine";
import type { ActiveRule, GameObject, LevelConfig, ObjectColor, Shape } from "./Types";
const colors: ObjectColor[] = ["blue", "red", "green", "yellow"];
const shapes: Shape[] = ["circle", "square", "triangle", "diamond"];
const pick = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)];
export function spawnObject(id: number, width: number, rule: ActiveRule, level: LevelConfig, now: number): GameObject {
  const target = Math.random() > level.distractorRatio;
  let color = pick(colors), shape = pick(shapes);
  if (target) {
    if (rule.type !== "shape") color = rule.targetColor!;
    if (rule.type !== "color") shape = rule.targetShape!;
  } else while (matchesRule(color, shape, rule)) { color = pick(colors); shape = pick(shapes); }
  const size = Math.max(36, 52 - level.difficulty * 2);
  return { id: `shift-${id}`, color, shape, x: size + Math.random() * Math.max(1, width - size * 2), y: -size, velocityX: (Math.random() - .5) * level.difficulty * 8, velocityY: level.speed * (.9 + Math.random() * .22), size, spawnedAt: now, target };
}
