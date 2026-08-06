import type { BallColor, RawBallStackMetrics } from "./Types";

export const BALL_STACK_DURATION_SECONDS = 90;
export const BALL_RADIUS = 32;
const PALETTE: BallColor[] = ["coral", "sun", "mint", "sky", "violet", "pink"];

export class BallStackEngine {
  // The first rendered ball is ID 1; generated balls must start at ID 2.
  private id = 1;
  private lastColor = -1;
  speedFor(level: number) { return Math.min(430, 145 + level * 13); }
  nextColor() {
    let index = Math.floor(Math.random() * PALETTE.length);
    if (index === this.lastColor) index = (index + 1) % PALETTE.length;
    this.lastColor = index;
    return PALETTE[index];
  }
  nextId() { this.id += 1; return this.id; }
  emptyMetrics(): RawBallStackMetrics {
    return { totalBallsDropped: 0, successfulPlacements: 0, failedPlacements: 0, highestTowerHeight: 0, alignmentPercentages: [], perfectPlacements: 0, reactionTimes: [], stabilityPercentages: [], elapsedSeconds: 0, endReason: "TIME_LIMIT_REACHED" };
  }
}
