import type { Furniture, FurnitureKind, Point } from "./Types";
const CATALOG: Array<[FurnitureKind, string, string, Furniture["size"]]> = [
  ["bed", "🛏️", "#7c86df", "large"],
  ["table", "🪵", "#c7864d", "medium"],
  ["chair", "🪑", "#e19053", "medium"],
  ["lamp", "💡", "#f4c94f", "small"],
  ["toybox", "🧰", "#ef7081", "medium"],
  ["bookshelf", "📚", "#a56b45", "large"],
  ["teddy", "🧸", "#d79a58", "small"],
  ["plant", "🪴", "#5bbf78", "small"],
];
const POSITIONS: Point[] = [
  { x: 18, y: 65 },
  { x: 38, y: 67 },
  { x: 58, y: 68 },
  { x: 78, y: 65 },
  { x: 26, y: 39 },
  { x: 49, y: 42 },
  { x: 72, y: 38 },
  { x: 88, y: 46 },
];
export class FurnitureGenerator {
  create(count: number, level: number): Furniture[] {
    const offset = (level * 2) % CATALOG.length;
    return Array.from({ length: count }, (_, index) => {
      const [kind, token, color, size] =
        CATALOG[(index + offset) % CATALOG.length];
      const target = POSITIONS[index];
      return {
        id: `${level}-${kind}-${index}-${Date.now()}`,
        kind,
        token,
        color,
        target,
        size,
        rotation: level >= 4 && index % 3 === 0 ? 8 : 0,
      };
    });
  }
}
