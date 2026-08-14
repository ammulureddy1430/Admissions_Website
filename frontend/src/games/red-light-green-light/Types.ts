export interface RawRedLightGreenLightMetrics {
  greenLightEvents: number;
  redLightEvents: number;
  correctStarts: number;
  correctStops: number;
  prematureMovements: number;
  averageStartReactionTime: number;
  averageStopReactionTime: number;
  progress: number;
  difficultyReached: number;
  completionStatus: "COMPLETED" | "TIMEOUT" | "ABANDONED";
}

export interface RedLightGreenLightScores extends RawRedLightGreenLightMetrics {
  inhibitoryControlScore: number;
  selfRegulationScore: number;
  attentionScore: number;
  responseControlScore: number;
  followingInstructionsScore: number;
  sustainedAttentionScore: number;
  reactionControlScore: number;
  consistencyScore: number;
  overallScore: number;
}
