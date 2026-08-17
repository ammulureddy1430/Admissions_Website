import type { SokobanAttempt, SokobanMetrics } from "./Types";
const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
export function scoreSokoban(
  attempts: SokobanAttempt[],
  completionStatus: string,
): SokobanMetrics {
  const completed = attempts.filter((attempt) => attempt.completed);
  const sum = (key: keyof SokobanAttempt) =>
    attempts.reduce((total, attempt) => total + Number(attempt[key]), 0);
  const totalMoves = sum("moves"),
    totalPushes = sum("pushes"),
    unnecessaryMoves = sum("unnecessaryMoves"),
    unnecessaryPushes = sum("unnecessaryPushes"),
    deadlocks = sum("deadlocks"),
    resets = sum("resets");
  const optimal = completed.reduce(
    (total, attempt) => total + attempt.optimalMoves,
    0,
  );
  const completedMoves = completed.reduce(
    (total, attempt) => total + attempt.moves,
    0,
  );
  const successRate = attempts.length ? completed.length / attempts.length : 0;
  const solutionEfficiency = cap(
    optimal ? (optimal / Math.max(optimal, completedMoves)) * 100 : 0,
  );
  const planningEfficiency = cap(
    100 -
      unnecessaryMoves * 3 -
      unnecessaryPushes * 9 -
      deadlocks * 12 -
      resets * 6,
  );
  const highestDifficulty = Math.max(
    0,
    ...completed.map((attempt) => attempt.difficulty),
  );
  const difficulty = (highestDifficulty / 6) * 100;
  const times = completed.map((attempt) => attempt.completionTime),
    mean = average(times);
  const consistency = cap(
    times.length < 2
      ? times.length
        ? 100
        : 0
      : 100 - average(times.map((time) => Math.abs(time - mean))) / 120,
  );
  const planningScore = cap(
    successRate * 45 + planningEfficiency * 0.35 + solutionEfficiency * 0.2,
  );
  const problemSolvingScore = cap(
    successRate * 55 + difficulty * 0.25 + solutionEfficiency * 0.2,
  );
  const spatialReasoningScore = cap(
    successRate * 50 + difficulty * 0.3 + solutionEfficiency * 0.2,
  );
  const workingMemoryScore = cap(
    successRate * 40 + consistency * 0.25 + planningEfficiency * 0.35,
  );
  const sequencingScore = cap(solutionEfficiency * 0.55 + successRate * 45);
  const cognitiveFlexibilityScore = cap(
    difficulty * 0.45 + successRate * 40 + Math.min(15, completed.length * 3),
  );
  const decisionMakingScore = cap(
    planningEfficiency * 0.55 + solutionEfficiency * 0.45,
  );
  const ruleFollowingScore = cap(
    100 - unnecessaryMoves * 4 - unnecessaryPushes * 10,
  );
  const visualSpatialAttentionScore = cap(
    successRate * 50 + planningEfficiency * 0.25 + difficulty * 0.25,
  );
  const skills = [
    planningScore,
    problemSolvingScore,
    spatialReasoningScore,
    workingMemoryScore,
    sequencingScore,
    cognitiveFlexibilityScore,
    decisionMakingScore,
    ruleFollowingScore,
    visualSpatialAttentionScore,
  ];
  return {
    puzzlesAttempted: attempts.length,
    puzzlesCompleted: completed.length,
    totalMoves,
    totalPushes,
    unnecessaryMoves,
    unnecessaryPushes,
    deadlocks,
    resets,
    completionTime: sum("completionTime"),
    highestDifficulty,
    solutionEfficiency,
    planningEfficiency,
    consistency,
    planningScore,
    problemSolvingScore,
    spatialReasoningScore,
    workingMemoryScore,
    sequencingScore,
    cognitiveFlexibilityScore,
    decisionMakingScore,
    ruleFollowingScore,
    visualSpatialAttentionScore,
    overallScore: cap(average(skills)),
    completionStatus,
    attempts,
  };
}
