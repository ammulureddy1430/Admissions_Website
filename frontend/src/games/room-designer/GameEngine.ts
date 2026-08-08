import { DifficultyManager } from "./DifficultyManager";
import { PlacementEngine } from "./PlacementEngine";
import { RoomGenerator } from "./RoomGenerator";
export const ROOM_DESIGNER_DURATION_SECONDS = 120;
export const ROOM_DESIGNER_MAX_ROOMS = 3;
export class RoomDesignerEngine {
  private difficulty = new DifficultyManager();
  private generator = new RoomGenerator(this.difficulty);
  readonly placement = new PlacementEngine();
  round() {
    return this.generator.next();
  }
  advance() {
    this.difficulty.advance();
  }
}
