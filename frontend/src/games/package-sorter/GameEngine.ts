import type { GameMetrics } from "./Types";

export const TOTAL_ROUNDS = 4;
export const PACKAGES_PER_ROUND = 6;

export class GameEngine {
  emptyMetrics(): GameMetrics {
    return {
      roundsPlayed: 1,
      packagesSorted: 0,
      correctDeliveries: 0,
      incorrectDeliveries: 0,
      decisionTimes: [],
      highestDifficulty: 1,
    };
  }

  // Calculate next round based on sorted packages
  getNextRound(currentRound: number, correctInRound: number): { nextRound: number; resetCounter: boolean } {
    if (correctInRound >= PACKAGES_PER_ROUND && currentRound < TOTAL_ROUNDS) {
      return {
        nextRound: currentRound + 1,
        resetCounter: true,
      };
    }
    return {
      nextRound: currentRound,
      resetCounter: false,
    };
  }
}
