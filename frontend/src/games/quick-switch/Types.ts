export type ColorType = "blue" | "red" | "green" | "yellow";
export type ShapeType = "circle" | "square" | "triangle" | "diamond";
export type StateType = "moving" | "stationary";

export interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: ColorType;
  shape: ShapeType;
  size: number;
  speed: number;
  spawnedAt: number;
  isStationary: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ActiveRule {
  id: number;
  type: "color" | "shape" | "combined" | "state";
  targetColor?: ColorType;
  targetShape?: ShapeType;
  targetState?: StateType;
  avoidColor?: ColorType;
  avoidShape?: ShapeType;
  avoidState?: StateType;
  description: string;
}

export interface RuleAnalytics {
  ruleId: number;
  ruleStartTime: number;
  ruleEndTime: number;
  interactions: number;
  correctInteractions: number;
  incorrectInteractions: number;
  firstCorrectResponseTime: number; // in ms from rule start
  switchingLatency: number; // in ms from rule start
  perseverativeErrors: number;
  accuracy: number; // percentage
  adaptationScore: number; // 0-100
}

export interface RawQuickSwitchMetrics {
  sessionDuration: number;
  totalInteractions: number;
  correctInteractions: number;
  incorrectInteractions: number;
  ruleChanges: number;
  switchingLatency: number; // average switching latency in ms
  perseverativeErrors: number;
  postSwitchErrors: number;
  postSwitchAccuracy: number;
  adaptationTime: number; // average time to first correct in ms
  recoveryTime: number; // average recovery time in ms
  responseConsistency: number; // std dev or consistency measure
  ruleMasteryTime: number; // time to 3 consecutive correct
  ruleSwitchSuccess: number;
  ruleSwitchFailure: number;
  attentionShiftEvents: number;
  taskSwitchEvents: number;
  comboCount: number;
  highestCombo: number;
  score: number;
  completionStatus: "COMPLETED" | "TIMEOUT" | "ABANDONED";
  ruleSpecificAnalytics: RuleAnalytics[];
}

export interface QuickSwitchScores extends RawQuickSwitchMetrics {
  cognitiveFlexibilityScore: number;
  ruleSwitchingScore: number;
  adaptiveResponseScore: number;
  mentalSetShiftingScore: number;
  attentionShiftingScore: number;
  errorRecoveryScore: number;
  responseAdaptationScore: number;
  processingFlexibilityScore: number;
  taskSwitchingScore: number;
  overallScore: number;
}
