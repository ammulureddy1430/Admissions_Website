export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

export interface TeammateState {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  routeType: string;
  routeIndex: number;
  targetX: number;
  targetY: number;
  isHoldingBall: boolean;
  stateTimer: number; // For holding ball or waiting
}

export interface DefenderState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  targetX: number;
  targetY: number;
  guardingId: string; // ID of teammate or player they are guarding
  cheatFactorX: number; // Shifting factor for defensive adaptation
  cheatFactorY: number;
}

export interface BallState {
  x: number;
  y: number;
  z: number; // Height for parabolic arc
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  carrierId: string | null; // "player", teammate ID, or null (traveling/loose)
  targetX: number | null;
  targetY: number | null;
  isTraveling: boolean;
  travelTime: number;
  maxTravelTime: number;
  passStartX?: number;
  passStartY?: number;
  isShot?: boolean;
}

export interface PlaymakerMetrics {
  sessionDuration: number;
  playsStarted: number;
  playsCompleted: number;
  passesAttempted: number;
  passesCompleted: number;
  passesIntercepted: number;
  passesOutOfBounds: number;
  passTargetSelections: number;
  appropriateTargetSelections: number;
  poorTargetSelections: number;
  leadPassAttempts: number;
  leadPassSuccesses: number;
  receiverMovementTracked: number;
  receiverPredictionAccuracy: number;
  defenderPredictionAccuracy: number;
  passingLaneRecognitions: number;
  passingLaneErrors: number;
  earlyPasses: number;
  latePasses: number;
  wellTimedPasses: number;
  decisionEvents: number;
  decisionTimes: number[];
  averageDecisionTime: number;
  riskPasses: number;
  safePasses: number;
  riskOutcomes: number[];
  strategyChanges: number;
  successfulStrategyChanges: number;
  failedStrategyChanges: number;
  repeatedStrategyCount: number;
  repeatedFailedStrategyCount: number;
  adaptiveResponses: number;
  defensiveAdaptationsDetected: number;
  defensiveAdaptationsMissed: number;
  situationalAwarenessEvents: number;
  selectiveAttentionEvents: number;
  distractorResponses: number;
  beginningPerformance: number;
  middlePerformance: number;
  endingPerformance: number;
  highestDifficulty: number;

  // Scores (0-100)
  overallScore?: number;
  anticipationScore?: number;
  decisionMakingScore?: number;
  spatialPredictionScore?: number;
  situationalAwarenessScore?: number;
  selectiveAttentionScore?: number;
  timingScore?: number;
  responseControlScore?: number;
  adaptabilityScore?: number;
  passingStrategyScore?: number;
  decisionConsistencyScore?: number;
}

export interface LevelData {
  id: number;
  name: string;
  teammateCount: number;
  defenderCount: number;
  passesToComplete: number;
  teammateRoutes: string[];
  teammateSpeedMultiplier: number;
  defenderGuardIds: string[];
  defenderSpeedMultiplier: number;
  defendersIntercept: boolean;
  defendersAdapt: boolean;
}
