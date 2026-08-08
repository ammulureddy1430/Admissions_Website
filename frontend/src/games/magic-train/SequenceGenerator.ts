import type { Carriage, CarriageKind } from "./Types";

const TOKENS: Record<CarriageKind, Array<[string, string]>> = {
  color: [["●", "#ff5d73"], ["●", "#43a9ff"], ["●", "#ffd34e"], ["●", "#62d49a"]],
  shape: [["★", "#9b73f0"], ["◆", "#ff8a4c"], ["▲", "#41bed0"], ["♥", "#f05f92"]],
  animal: [["🐵", "#f2a65a"], ["🦁", "#f5c64d"], ["🐼", "#e9eef3"], ["🐸", "#7bd36d"]],
  symbol: [["☀", "#ffd34e"], ["☂", "#6e8df7"], ["♫", "#c67cf3"], ["⚡", "#ffb53f"]],
};

export class SequenceGenerator {
  create(length: number, difficulty: number): Carriage[] {
    const kinds: CarriageKind[] = difficulty < 4 ? ["color"] : difficulty < 6 ? ["color", "shape", "animal"] : ["color", "shape", "animal", "symbol"];
    const pool = kinds.flatMap((kind) => TOKENS[kind].map(([token, color], index) => ({ id: `${kind}-${index}`, token, color, kind })));
    const first = pool[Math.floor(Math.random() * pool.length)];
    const secondPool = pool.filter((item) => item.id !== first.id);
    const second = secondPool[Math.floor(Math.random() * secondPool.length)];
    return Array.from({ length }, (_, index) => {
      const base = difficulty <= 3 ? (index % 2 ? second : first) : pool[Math.floor(Math.random() * pool.length)];
      return { ...base, id: `${base.id}-${index}-${Date.now()}` };
    });
  }
}
