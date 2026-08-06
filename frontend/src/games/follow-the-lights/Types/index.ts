export type LightColor = "red" | "green" | "blue" | "yellow";
export type GamePhase =
  "ready" | "watch" | "repeat" | "transition" | "complete";

export type RawGameMetrics = {
  totalSequences: number;
  completedSequences: number;
  longestSequence: number;
  mistakes: number;
  correctTaps: number;
  wrongTaps: number;
  reactionTimes: number[];
  tapDelays: number[];
  elapsedSeconds: number;
  endReason:
    "TIME_LIMIT_REACHED" | "MISTAKE_LIMIT_REACHED" | "ROUNDS_COMPLETED";
};

export type CognitiveScores = RawGameMetrics & {
  averageReactionTime: number;
  averageTapDelay: number;
  completionPercentage: number;
  memoryScore: number;
  focusScore: number;
  processingSpeed: number;
  learningPotential: number;
  accuracy: number;
  attention: number;
  visualMemory: number;
  overallScore: number;
};
