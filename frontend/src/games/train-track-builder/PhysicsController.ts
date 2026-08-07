import type { TrackPuzzle } from "./Types";
import { TrackRotationEngine } from "./TrackRotationEngine";

export class TrainPhysicsController {
  private rotations = new TrackRotationEngine();

  route(puzzle: TrackPuzzle, connected: boolean) {
    if (connected) return [...puzzle.route, puzzle.station];
    const firstBroken = puzzle.route.findIndex(
      (_, index) => !puzzle.pieces[index] || !this.rotations.isAligned(puzzle.pieces[index]),
    );
    return puzzle.route.slice(0, Math.max(1, firstBroken + 1));
  }
}
