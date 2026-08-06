import type { ColorKey, ColorPathRound, PathStone } from "./Types";

const COLORS: Record<ColorKey, { base: string; shades: string[] }> = {
  red: { base: "#ef4444", shades: ["#f87171", "#dc2626"] }, green: { base: "#22c55e", shades: ["#4ade80", "#16a34a"] },
  blue: { base: "#3b82f6", shades: ["#60a5fa", "#2563eb"] }, yellow: { base: "#facc15", shades: ["#fde047", "#eab308"] },
  purple: { base: "#a855f7", shades: ["#c084fc", "#9333ea"] },
};
export const COLOR_LABELS: Record<ColorKey, string> = { red: "Red", green: "Green", blue: "Blue", yellow: "Yellow", purple: "Purple" };
const keys = Object.keys(COLORS) as ColorKey[];
const random = (max: number) => { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] % max; };
const shuffle = <T,>(items: T[]) => { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = random(i + 1); [result[i], result[j]] = [result[j], result[i]]; } return result; };

export class ColorPathGenerator {
  create(roundNumber: number): ColorPathRound {
    const difficulty = Math.min(5, roundNumber); const count = difficulty === 1 ? 3 : difficulty === 2 ? 4 : difficulty === 3 ? 5 : 6;
    const target = keys[random(keys.length)];
    const distractors = shuffle(keys.filter(key => key !== target));
    const pool: ColorKey[] = [target, ...distractors].slice(0, count);
    while (pool.length < count) pool.push(difficulty >= 5 ? target : distractors[random(distractors.length)]);
    const colors = shuffle(pool); const targetIndex = colors.indexOf(target);
    const reverseLayout = random(2) === 1;
    const xStart = count <= 3 ? 25 : 15;
    const xEnd = count <= 3 ? 75 : 87;
    const stones: PathStone[] = colors.map((color, index) => {
      const isTarget = index === targetIndex;
      const shade = difficulty >= 5 && !isTarget && color === target;
      const fill = shade ? COLORS[color].shades[random(2)] : COLORS[color].base;
      const layoutIndex = reverseLayout ? count - 1 - index : index;
      const x = xStart + (layoutIndex / Math.max(1, count - 1)) * (xEnd - xStart);
      const wave = layoutIndex % 2 ? -1 : 1;
      return { id: `${roundNumber}-${index}-${random(1_000_000)}`, color, fill, x, y: 57 + wave * (7 + random(5)), shade };
    });
    return { id: roundNumber, difficulty, target, targetFill: COLORS[target].base, stones };
  }
}
