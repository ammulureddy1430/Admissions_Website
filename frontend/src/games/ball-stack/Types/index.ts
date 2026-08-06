export type BallColor = "coral" | "sun" | "mint" | "sky" | "violet" | "pink";
export type BallState = { id: number; x: number; y: number; radius: number; color: BallColor; stable: boolean; falling: boolean };
export type RawBallStackMetrics = {
  totalBallsDropped: number; successfulPlacements: number; failedPlacements: number;
  highestTowerHeight: number; alignmentPercentages: number[]; perfectPlacements: number;
  reactionTimes: number[]; stabilityPercentages: number[]; elapsedSeconds: number;
  endReason: "TIME_LIMIT_REACHED" | "TOWER_COLLAPSED" | "ROUNDS_COMPLETED";
};
export type BallStackScores = RawBallStackMetrics & {
  averageAlignment: number; averageReactionTime: number; towerStabilityScore: number;
  handEyeCoordinationScore: number; fineMotorScore: number; precisionScore: number;
  concentrationScore: number; patienceScore: number; reactionSpeedScore: number;
  consistencyScore: number; timingAccuracyScore: number; overallCognitiveScore: number;
  completionStatus: "COMPLETED" | "TOWER_COLLAPSED";
};
