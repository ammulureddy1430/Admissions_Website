export type GardenSymbol = "★" | "●" | "✿" | "◆";
export type FallingObject = { id: number; symbol: GardenSymbol; target: boolean; x: number; y: number; size: number; speed: number; spawnedAt: number; enteredCatchZoneAt: number | null };
export type CatchEvent = { target: boolean; caught: boolean; timestamp: number; objectX: number; catcherX: number; horizontalDistance: number; difficulty: number; speed: number; symbol: GardenSymbol; responseTime: number };
export type CatchMetrics = {
  totalObjects: number; targetObjects: number; targetsCaught: number; targetsMissed: number;
  distractorsCaught: number; distractorsAvoided: number; catchAccuracy: number;
  targetDiscriminationAccuracy: number; movementDistance: number; movementEfficiency: number;
  responseTime: number; highestDifficulty: number; roundsCompleted: number; performanceConsistency: number;
  visualTrackingScore: number; handEyeCoordinationScore: number; selectiveAttentionScore: number;
  sustainedAttentionScore: number; responseControlScore: number; processingSpeedScore: number;
  visualDiscriminationScore: number; accuracyScore: number; overallScore: number;
  completionStatus: string; events: CatchEvent[];
};
