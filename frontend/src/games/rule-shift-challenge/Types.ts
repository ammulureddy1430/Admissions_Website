export type ObjectColor = 'red' | 'blue' | 'green' | 'yellow';
export type ObjectShape = 'circle' | 'triangle' | 'square' | 'star';
export type DecisionSide = 'left' | 'right';
export type RuleMode = 'color' | 'shape' | 'reverseColor' | 'combination';

export interface GameObject {
  id: string;
  color: ObjectColor;
  shape: ObjectShape;
  isDistractor: boolean;
  x: number; // Percentage width: 0 to 100
  y: number; // Percentage height: 0 to 100
  speed: number;
  spawnedAt: number;
  decidedAt?: number;
  decision?: DecisionSide;
  status: 'moving' | 'active' | 'sorted' | 'missed';
  destinationX?: number;
  destinationY?: number;
  opacity?: number;
}

export interface ActiveRule {
  mode: RuleMode;
  version: number; // Changes on every rule shift
  description: string;
  colorMapping?: Record<ObjectColor, DecisionSide>;
  shapeMapping?: Record<ObjectShape, DecisionSide>;
  combinationRule?: {
    targetColor: ObjectColor;
    targetShape: ObjectShape;
    targetSide: DecisionSide;
    defaultSide: DecisionSide;
  };
}

export interface LevelConfig {
  level: number;
  name: string;
  mode: RuleMode;
  allowedColors: ObjectColor[];
  allowedShapes: ObjectShape[];
  speed: number;
  spawnInterval: number;
  trialsPerRule: number;
  ruleDisplayDuration: number; // ms, -1 for infinite
  hasShifts: boolean;
  hasDistractors: boolean;
  distractorFrequency: number; // 0 to 1
}

export interface RuleShiftMetrics {
  sessionDuration: number;
  totalTrials: number;
  validTrials: number;
  correctResponses: number;
  incorrectResponses: number;
  missedResponses: number;
  responseTimes: number[];
  averageResponseTime: number;
  medianResponseTime: number;
  fastestResponseTime: number;
  slowestResponseTime: number;
  ruleChanges: number;
  ruleChangeTrials: number;
  ruleSwitchErrors: number;
  perseverativeErrors: number;
  postSwitchErrors: number;
  adaptationTrials: number;
  adaptationTime: number;
  switchCost: number;
  ruleRetentionErrors: number;
  shapeRuleErrors: number;
  colorRuleErrors: number;
  reverseRuleErrors: number;
  combinationRuleErrors: number;
  distractorErrors: number;
  taskSwitches: number;
  successfulTaskSwitches: number;
  failedTaskSwitches: number;
  beginningAccuracy: number;
  middleAccuracy: number;
  endingAccuracy: number;
  beginningResponseTime: number;
  middleResponseTime: number;
  endingResponseTime: number;
  highestDifficulty: number;
  completionStatus: 'COMPLETED' | 'INCOMPLETE';
}

export interface RuleShiftScores extends RuleShiftMetrics {
  cognitiveFlexibilityScore: number;
  inhibitoryControlScore: number;
  selectiveAttentionScore: number;
  workingMemoryScore: number;
  taskSwitchingScore: number;
  processingSpeedScore: number;
  sustainedAttentionScore: number;
  ruleLearningScore: number;
  adaptationScore: number;
  overallScore: number;
}
