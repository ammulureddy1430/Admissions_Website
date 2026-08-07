export type Direction = "N" | "E" | "S" | "W";
export type TrackKind = "straight" | "curve" | "switch" | "bridge";
export type TrackPiece = { id: string; row: number; col: number; kind: TrackKind; baseConnections: Direction[]; correctRotation: number; rotation: number };
export type TrackPuzzle = { id: number; difficulty: number; rows: number; cols: number; pieces: TrackPiece[]; route: Array<{ row: number; col: number }>; station: { row: number; col: number }; train: { row: number; col: number } };
export type RawTrainMetrics = { roundsPlayed: number; tracksCompleted: number; successfulRoutes: number; correctRotations: number; incorrectRotations: number; completionTimes: number[]; highestDifficulty: number; elapsedSeconds: number };
export type TrainTrackScores = { roundsPlayed: number; tracksCompleted: number; successfulRoutes: number; correctRotations: number; incorrectRotations: number; averageCompletionTime: number; highestDifficulty: number; logicalAccuracy: number; logicalThinkingScore: number; causeEffectScore: number; completionPercentage: number; overallScore: number; completionStatus: "COMPLETED" | "PARTIAL"; elapsedSeconds: number };
