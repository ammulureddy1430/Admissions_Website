import type { LightColor } from "./Types";
import { randomSequence } from "./Utils/random";

export const gameEngine = "FOLLOW_THE_LIGHTS" as const;
export const GAME_DURATION_SECONDS = 120;
export const MAX_MISTAKES = 3;

export class FollowLightsEngine {
  private round = 0;
  private sequence: LightColor[] = [];

  nextRound(increaseDifficulty = true) {
    if (this.round === 0) this.round = 1;
    else if (increaseDifficulty) this.round += 1;
    this.sequence = randomSequence(Math.min(this.round + 1, 4));
    return {
      round: this.round,
      sequence: [...this.sequence],
      ...this.timing(),
    };
  }

  expected(index: number) {
    return this.sequence[index];
  }
  length() {
    return this.sequence.length;
  }

  private timing() {
    return {
      glowMs: Math.max(600, 850 - (this.round - 1) * 15),
      gapMs: Math.max(300, 450 - (this.round - 1) * 10),
    };
  }
}
