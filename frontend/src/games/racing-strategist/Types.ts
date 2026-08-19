export interface VehicleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  speed: number;
  accelerating: boolean;
  braking: boolean;
  steering: number; // -1 to 1
  width: number;
  height: number;
  currentLane: number;
}

export interface TrackSegment {
  yStart: number;
  yEnd: number;
  centerX: number;
  width: number;
  type: "normal" | "split" | "shortcut" | "wet" | "finish";
  leftForkCenterX?: number;
  rightForkCenterX?: number;
  forkWidth?: number;
  isBlocked?: boolean;
  blockageMessage?: string;
  laneCount: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "static_barrier" | "debris" | "moving_rock";
  vx: number;
  minX?: number;
  maxX?: number;
  avoided: boolean;
  collided: boolean;
}

export interface Opponent {
  id: string;
  x: number;
  y: number;
  speed: number;
  lane: number;
  targetLane: number;
  laneOffset: number;
  width: number;
  height: number;
  color: string;
  isOvertaken: boolean;
  isCollided: boolean;
  waitTracked: boolean;
}

export interface DecisionEvent {
  id: string;
  y: number;
  type: "split" | "shortcut" | "overtake" | "obstacle" | "wet_zone" | "adaptation";
  options: string[];
  chosenOption?: string;
  outcome?: "success" | "fail" | "neutral";
  timeInitiated: number;
  timeDecided?: number;
  riskRating: "low" | "medium" | "high";
  trackId: number;
}

export interface RacingStrategistMetrics {
  sessionDuration: number;
  tracksStarted: number;
  tracksCompleted: number;
  distanceTravelled: number;
  routeChoices: number;
  safeRouteChoices: number;
  riskyRouteChoices: number;
  shortcutChoices: number;
  shortcutSuccesses: number;
  shortcutFailures: number;
  overtakeAttempts: number;
  successfulOvertakes: number;
  unsuccessfulOvertakes: number;
  overtakeWaitDecisions: number;
  collisions: number;
  nearCollisions: number;
  obstacleAvoidanceAttempts: number;
  successfulObstacleAvoidance: number;
  brakingEvents: number;
  appropriateBrakingEvents: number;
  lateBrakingEvents: number;
  unnecessaryBrakingEvents: number;
  speedChanges: number;
  routeChanges: number;
  strategyChanges: number;
  adaptiveDecisions: number;
  successfulAdaptations: number;
  failedAdaptations: number;
  anticipatedEvents: number;
  lateResponses: number;
  decisionEvents: number;
  averageDecisionTime: number;
  decisionConsistency: number;
  riskDecisions: number;
  opponentInteractions: number;
  trackConditionChanges: number;
  responseToTrackChanges: number;
  beginningPerformance: number;
  middlePerformance: number;
  endingPerformance: number;
  highestDifficulty: number;

  // Scores
  strategicDecisionMakingScore: number;
  riskAssessmentScore: number;
  anticipatoryReasoningScore: number;
  adaptiveDecisionMakingScore: number;
  routeSelectionScore: number;
  consequencePredictionScore: number;
  spatialJudgmentScore: number;
  planningScore: number;
  situationalAwarenessScore: number;
  responseControlScore: number;
  problemSolvingScore: number;
  decisionConsistencyScore: number;
  overallScore: number;

  // Arrays/additional details
  decisionTimes: number[];
  routeChoiceTypes: string[];
  riskOutcomes: string[];
  completionStatus: string;
}
