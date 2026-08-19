export interface ClimbingHold {
  id: string;
  x: number;
  y: number;
  size: number;
  type: "large" | "medium" | "small" | "side" | "temporary";
  available: boolean;
  flashState?: boolean;
  flashTimer?: number;
  originalX?: number;
  originalY?: number;
}

export interface LimbState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  holdId: string | null;
  isMoving: boolean;
  moveTimer: number;
  moveDuration: number;
  startX: number;
  startY: number;
}

export interface ClimberState {
  x: number; // Center torso position
  y: number;
  targetX: number;
  targetY: number;
  isTransitioning: boolean;
  leftHand: LimbState;
  rightHand: LimbState;
  leftFoot: LimbState;
  rightFoot: LimbState;
  balance: number; // 0 to 100
  wobbleX: number;
  wobbleY: number;
  wobblePhase: number;
  state: "idle" | "reaching" | "pulling" | "wobbling" | "recovering";
}

export interface LevelData {
  id: number;
  name: string;
  height: number;
  targetY: number;
  holds: ClimbingHold[];
  difficulty: number;
  description: string;
}

export interface ClimbingMetrics {
  sessionDuration: number;
  climbsStarted: number;
  climbsCompleted: number;
  holdsReached: number;
  holdsMissed: number;
  reachAttempts: number;
  successfulReaches: number;
  failedReaches: number;
  movementAttempts: number;
  successfulMovements: number;
  movementCorrections: number;
  unnecessaryMovements: number;
  routeChoices: number;
  routeChanges: number;
  multiStepSequences: number;
  sequenceSuccesses: number;
  sequenceErrors: number;
  bodyRepositioningEvents: number;
  successfulRepositioning: number;
  balanceEvents: number;
  recoveryEvents: number;
  reachAccuracy: number;
  movementAccuracy: number;
  adaptiveEvents: number;
  successfulAdaptations: number;
  failedAdaptations: number;
  averageDecisionTime: number;
  climbingSpeed: number;
  beginningPerformance: number;
  middlePerformance: number;
  endingPerformance: number;
  highestDifficulty: number;

  // Internal score mappings (0-100)
  overallScore?: number;
  motorPlanningScore?: number;
  spatialMotorCoordinationScore?: number;
  visualSpatialReasoningScore?: number;
  movementSequencingScore?: number;
  bodyPositionAwarenessScore?: number;
  reachPlanningScore?: number;
  precisionScore?: number;
  visualTrackingScore?: number;
  adaptiveMotorControlScore?: number;
  decisionMakingScore?: number;
  responseControlScore?: number;
}
