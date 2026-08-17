export type TangramPieceType =
  | "triangle"
  | "square"
  | "parallelogram"
  | "diamond"
  | "rectangle"
  | "polygon";

export type TangramPieceDefinition = {
  id: string;
  type: TangramPieceType;
  points: string;
  width: number;
  height: number;
  color: string;
};

export type TangramSlot = {
  pieceId: string;
  x: number;
  y: number;
  targetOffsetX?: number;
  targetOffsetY?: number;
  rotation: number;
};

export type TangramLevel = {
  id: number;
  difficulty: number;
  pieces: TangramPieceDefinition[];
  slots: TangramSlot[];
};

export type TangramPieceState = TangramPieceDefinition & {
  x: number;
  y: number;
  rotation: number;
  placed: boolean;
  moveCount: number;
  rotationCount: number;
  placementAttempts: number;
  repositionCount: number;
  travel: number;
};

export type TangramAttempt = {
  levelId: number;
  difficulty: number;
  completed: boolean;
  piecesMoved: number;
  piecesRotated: number;
  unnecessaryMovements: number;
  unnecessaryRotations: number;
  placementAttempts: number;
  successfulPlacements: number;
  repositioning: number;
  completionTime: number;
};

export type TangramMetrics = {
  puzzlesAttempted: number;
  puzzlesCompleted: number;
  piecesMoved: number;
  piecesRotated: number;
  unnecessaryMovements: number;
  unnecessaryRotations: number;
  placementAttempts: number;
  successfulPlacements: number;
  repositioning: number;
  completionTime: number;
  difficultyReached: number;
  puzzleCompletionRate: number;
  solutionEfficiency: number;
  consistency: number;
  spatialReasoningScore: number;
  visualSpatialPerceptionScore: number;
  mentalManipulationScore: number;
  problemSolvingScore: number;
  planningScore: number;
  visualDiscriminationScore: number;
  cognitiveFlexibilityScore: number;
  workingMemoryScore: number;
  visualMotorCoordinationScore: number;
  attentionScore: number;
  overallScore: number;
  completionStatus: string;
  attempts: TangramAttempt[];
};
