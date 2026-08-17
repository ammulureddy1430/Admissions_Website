export type RotationShape = "key" | "plane" | "chair" | "boot" | "rocket";

export type RotationChallenge = {
  id: number;
  level: number;
  shape: RotationShape;
  targetRotation: number;
  startRotation: number;
};

export type RotationAttempt = {
  challengeId: number;
  level: number;
  matched: boolean;
  targetRotation: number;
  finalRotation: number;
  angularDifference: number;
  rotationAmount: number;
  rotationActions: number;
  extraRotations: number;
  completionTime: number;
};

export type MentalRotationMetrics = {
  totalChallenges: number;
  completedChallenges: number;
  orientationMatches: number;
  orientationMismatches: number;
  rotationAmount: number;
  rotationActions: number;
  extraRotations: number;
  averageCompletionTime: number;
  rotationEfficiency: number;
  highestDifficulty: number;
  consistency: number;
  interactionEfficiency: number;
  spatialVisualizationScore: number;
  mentalRotationScore: number;
  spatialReasoningScore: number;
  visualDiscriminationScore: number;
  visualMotorCoordinationScore: number;
  cognitiveFlexibilityScore: number;
  attentionScore: number;
  overallScore: number;
  completionStatus: string;
  attempts: RotationAttempt[];
};
