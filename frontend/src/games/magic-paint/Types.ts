export type PaintObjectId = "butterfly" | "flower" | "fish" | "balloon" | "apple" | "star";
export type PaintObject = { id: PaintObjectId; parts: string[]; difficulty: number };
export type RawMagicPaintMetrics = { objectsCompleted: number; colorsUsed: string[]; interactionsPerObject: number[]; completionTimes: number[]; animationTriggerSuccess: number; elapsedSeconds: number; endReason: string };
export type MagicPaintScores = RawMagicPaintMetrics & { averageCompletionTime: number; interactionConsistency: number; explorationLevel: number; completionPercentage: number; creativityScore: number; causeEffectScore: number; overallScore: number; completionStatus: string };
