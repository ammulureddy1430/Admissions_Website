export type Position = { row: number; col: number };
export type Direction = "up" | "down" | "left" | "right";
export type CellType =
  "wall" | "floor" | "goal" | "player" | "box" | "playerOnGoal" | "boxOnGoal";

export type SokobanLevel = {
  id: number;
  difficulty: number;
  optimalMoves: number;
  map: string[];
};

export type SokobanState = {
  rows: number;
  cols: number;
  walls: Position[];
  goals: Position[];
  player: Position;
  boxes: Position[];
  moves: number;
  pushes: number;
  blockedMoves: number;
  unnecessaryPushes: number;
  deadlocks: number;
  completed: boolean;
};

export type MoveResult = {
  state: SokobanState;
  moved: boolean;
  pushed: boolean;
  blocked: boolean;
  deadlock: boolean;
};

export type SokobanAttempt = {
  levelId: number;
  difficulty: number;
  completed: boolean;
  moves: number;
  pushes: number;
  unnecessaryMoves: number;
  unnecessaryPushes: number;
  deadlocks: number;
  resets: number;
  optimalMoves: number;
  completionTime: number;
};

export type SokobanMetrics = {
  puzzlesAttempted: number;
  puzzlesCompleted: number;
  totalMoves: number;
  totalPushes: number;
  unnecessaryMoves: number;
  unnecessaryPushes: number;
  deadlocks: number;
  resets: number;
  completionTime: number;
  highestDifficulty: number;
  solutionEfficiency: number;
  planningEfficiency: number;
  consistency: number;
  planningScore: number;
  problemSolvingScore: number;
  spatialReasoningScore: number;
  workingMemoryScore: number;
  sequencingScore: number;
  cognitiveFlexibilityScore: number;
  decisionMakingScore: number;
  ruleFollowingScore: number;
  visualSpatialAttentionScore: number;
  overallScore: number;
  completionStatus: string;
  attempts: SokobanAttempt[];
};
