import { DifficultyManager } from "./DifficultyManager";
import { FurnitureGenerator } from "./FurnitureGenerator";
import type { RoomRound, RoomTheme } from "./Types";
const THEMES: RoomTheme[] = ["bedroom", "playroom", "study", "garden"];
export class RoomGenerator {
  constructor(
    private difficulty: DifficultyManager,
    private furniture = new FurnitureGenerator(),
  ) {}
  next(): RoomRound {
    const level = this.difficulty.current();
    return {
      level,
      theme: THEMES[(level - 1) % THEMES.length],
      objects: this.furniture.create(this.difficulty.objectCount(), level),
      observationMs: this.difficulty.observationMs(),
    };
  }
}
