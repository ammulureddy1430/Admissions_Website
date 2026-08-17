export type ObjectColor = "blue" | "red" | "green" | "yellow";
export type Shape = "circle" | "square" | "triangle" | "diamond";
export type RuleType = "color" | "shape" | "colorAndShape";
export type ActiveRule = { type: RuleType; targetColor?: ObjectColor; targetShape?: Shape };
export type GameObject = { id: string; color: ObjectColor; shape: Shape; x: number; y: number; velocityX: number; velocityY: number; size: number; spawnedAt: number; target: boolean };
export type ShiftEvent = { kind: "target" | "distractor" | "miss"; at: number; afterSwitch: boolean; oldRuleResponse: boolean; responseTime: number };
export type ColorShiftMetrics = {
  sessionDuration: number; objectsSpawned: number; objectsCollected: number;
  distractorsTouched: number; validTargetsMissed: number; ruleSwitches: number;
  postSwitchErrors: number; postSwitchAdaptationTime: number;
  oldRuleResponsesAfterSwitch: number; newRuleResponsesAfterSwitch: number;
  averageResponseTime: number; responseConsistency: number; highestDifficulty: number;
  cognitiveFlexibilityScore: number; inhibitoryControlScore: number;
  selectiveAttentionScore: number; sustainedAttentionScore: number;
  workingMemoryScore: number; visualDiscriminationScore: number;
  decisionMakingScore: number; processingSpeedScore: number; overallScore: number;
  completionStatus: string;
};
export type LevelConfig = { difficulty: number; ruleType: RuleType; speed: number; spawnMs: number; distractorRatio: number; maxObjects: number };
