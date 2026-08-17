export type JugState = { capacity: number; amount: number };

export type WaterJugsChallenge = {
  id: number;
  level: number;
  capacities: number[];
  targetJug: number;
  targetAmount: number;
  optimalActions: number;
};

export type JugAction =
  | { type: "fill"; jug: number }
  | { type: "empty"; jug: number }
  | { type: "pour"; from: number; to: number }
  | { type: "reset" };

export type ChallengeAttempt = {
  challengeId: number;
  level: number;
  targetReached: boolean;
  actions: number;
  unnecessaryActions: number;
  resets: number;
  optimalActions: number;
  completionTime: number;
};

export type WaterJugsMetrics = {
  challengesAttempted: number;
  challengesCompleted: number;
  targetsReached: number;
  targetsMissed: number;
  totalActions: number;
  unnecessaryActions: number;
  solutionEfficiency: number;
  planningEfficiency: number;
  completionTime: number;
  highestDifficulty: number;
  failedAttempts: number;
  resetActions: number;
  consistency: number;
  logicalReasoningScore: number;
  problemSolvingScore: number;
  planningScore: number;
  workingMemoryScore: number;
  cognitiveFlexibilityScore: number;
  sequentialThinkingScore: number;
  decisionMakingScore: number;
  visualSpatialReasoningScore: number;
  overallScore: number;
  completionStatus: string;
  attempts: ChallengeAttempt[];
};
