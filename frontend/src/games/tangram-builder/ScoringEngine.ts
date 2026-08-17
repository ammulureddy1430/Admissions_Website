import type { TangramAttempt, TangramMetrics } from "./Types";

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const sum = (items: TangramAttempt[], field: keyof TangramAttempt) =>
  items.reduce((total, item) => total + Number(item[field] || 0), 0);
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function scoreTangram(attempts: TangramAttempt[], completionStatus: string): TangramMetrics {
  const completed = attempts.filter((attempt) => attempt.completed);
  const piecesMoved = sum(attempts, "piecesMoved");
  const piecesRotated = sum(attempts, "piecesRotated");
  const unnecessaryMovements = sum(attempts, "unnecessaryMovements");
  const unnecessaryRotations = sum(attempts, "unnecessaryRotations");
  const placementAttempts = sum(attempts, "placementAttempts");
  const successfulPlacements = sum(attempts, "successfulPlacements");
  const repositioning = sum(attempts, "repositioning");
  const completionTime = sum(attempts, "completionTime");
  const completionRate = attempts.length ? completed.length / attempts.length : 0;
  const placementAccuracy = placementAttempts ? successfulPlacements / placementAttempts : 0;
  const solutionEfficiency = cap(placementAccuracy * 65 + Math.max(0, 35 - unnecessaryMovements * 1.5 - unnecessaryRotations));
  const times = completed.map((attempt) => attempt.completionTime);
  const consistency = cap(times.length < 2 ? (times.length ? 100 : 0) : 100 - (Math.max(...times) - Math.min(...times)) / 120);
  const difficultyReached = Math.max(0, ...attempts.map((attempt) => attempt.difficulty));
  const progression = (difficultyReached / 3) * 100;
  const spatialReasoningScore = cap(completionRate * 50 + solutionEfficiency * 0.3 + progression * 0.2);
  const visualSpatialPerceptionScore = cap(placementAccuracy * 65 + progression * 0.35);
  const mentalManipulationScore = cap(completionRate * 45 + solutionEfficiency * 0.35 + progression * 0.2);
  const problemSolvingScore = cap(completionRate * 55 + progression * 0.25 + consistency * 0.2);
  const planningScore = cap(solutionEfficiency * 0.65 + completionRate * 35);
  const visualDiscriminationScore = cap(placementAccuracy * 70 + progression * 0.3);
  const cognitiveFlexibilityScore = cap(completionRate * 45 + Math.min(100, repositioning * 8) * 0.2 + progression * 0.35);
  const workingMemoryScore = cap(completionRate * 55 + consistency * 0.25 + progression * 0.2);
  const visualMotorCoordinationScore = cap(placementAccuracy * 60 + solutionEfficiency * 0.4);
  const attentionScore = cap(completionRate * 50 + consistency * 0.3 + placementAccuracy * 20);
  const scores = [spatialReasoningScore, visualSpatialPerceptionScore, mentalManipulationScore, problemSolvingScore, planningScore, visualDiscriminationScore, cognitiveFlexibilityScore, workingMemoryScore, visualMotorCoordinationScore, attentionScore];
  return {
    puzzlesAttempted: attempts.length,
    puzzlesCompleted: completed.length,
    piecesMoved,
    piecesRotated,
    unnecessaryMovements,
    unnecessaryRotations,
    placementAttempts,
    successfulPlacements,
    repositioning,
    completionTime,
    difficultyReached,
    puzzleCompletionRate: cap(completionRate * 100),
    solutionEfficiency,
    consistency,
    spatialReasoningScore,
    visualSpatialPerceptionScore,
    mentalManipulationScore,
    problemSolvingScore,
    planningScore,
    visualDiscriminationScore,
    cognitiveFlexibilityScore,
    workingMemoryScore,
    visualMotorCoordinationScore,
    attentionScore,
    overallScore: cap(avg(scores)),
    completionStatus,
    attempts,
  };
}
