export type ColorKey = "red" | "green" | "blue" | "yellow" | "purple";
export type PathStone = { id: string; color: ColorKey; fill: string; x: number; y: number; shade: boolean };
export type ColorPathRound = { id: number; difficulty: number; target: ColorKey; targetFill: string; stones: PathStone[] };
export type RawColorPathMetrics = { roundsPlayed: number; correctSelections: number; incorrectSelections: number; responseTimes: number[]; highestDifficulty: number; elapsedSeconds: number; endReason: "TIME_LIMIT_REACHED" | "ROUNDS_COMPLETED" };
export type ColorPathScores = { roundsPlayed: number; correctSelections: number; incorrectSelections: number; averageResponseTime: number; observationAccuracy: number; observationScore: number; visualRecognitionScore: number; highestDifficulty: number; completionPercentage: number; overallScore: number; completionStatus: "COMPLETED" | "INCOMPLETE"; elapsedSeconds: number; endReason: "TIME_LIMIT_REACHED" | "ROUNDS_COMPLETED" };
