import type { PaintObject, PaintObjectId, RawMagicPaintMetrics } from "./Types";
export const MAGIC_PAINT_DURATION_SECONDS = 120;
const OBJECTS: Record<PaintObjectId, string[]> = {
  butterfly: ["leftWing", "rightWing", "leftDot", "rightDot", "body"],
  flower: ["petal1", "petal2", "petal3", "petal4", "center", "leaf"],
  fish: ["body", "tail", "topFin", "bottomFin", "spot", "eye"],
  balloon: ["balloon1", "balloon2", "balloon3", "balloon4", "basket"],
  apple: ["fruit", "leaf", "shine", "stem"],
  star: ["top", "left", "right", "bottomLeft", "bottomRight", "center"],
};
const ids = Object.keys(OBJECTS) as PaintObjectId[];
export class MagicPaintEngine {
  private round = 0; private used = new Set<PaintObjectId>();
  next(): PaintObject {
    this.round += 1;
    const complexityOrder: PaintObjectId[][] = [["apple","balloon"],["butterfly","apple","balloon"],["flower","fish","butterfly"],["star","flower","fish"],ids];
    let eligible = complexityOrder[Math.min(4,this.round-1)].filter(id=>!this.used.has(id));
    if (!eligible.length) eligible = ids.filter(id=>!this.used.has(id));
    const id = eligible[Math.floor(Math.random() * eligible.length)]; this.used.add(id);
    return { id, difficulty: Math.min(5, this.round), parts: [...OBJECTS[id]] };
  }
  emptyMetrics(): RawMagicPaintMetrics { return { objectsCompleted: 0, colorsUsed: [], interactionsPerObject: [], completionTimes: [], animationTriggerSuccess: 0, elapsedSeconds: 0, endReason: "TIME_LIMIT_REACHED" }; }
}
