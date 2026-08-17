import type { ChallengeAttempt, WaterJugsMetrics } from "./Types";

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export function scoreWaterJugs(
  attempts: ChallengeAttempt[],
  completionStatus: string,
): WaterJugsMetrics {
  const completed = attempts.filter((attempt) => attempt.targetReached);
  const totalActions = attempts.reduce(
    (sum, attempt) => sum + attempt.actions,
    0,
  );
  const unnecessaryActions = attempts.reduce(
    (sum, attempt) => sum + attempt.unnecessaryActions,
    0,
  );
  const resetActions = attempts.reduce(
    (sum, attempt) => sum + attempt.resets,
    0,
  );
  const optimal = completed.reduce(
    (sum, attempt) => sum + attempt.optimalActions,
    0,
  );
  const completedActions = completed.reduce(
    (sum, attempt) => sum + attempt.actions,
    0,
  );
  const successRate = attempts.length ? completed.length / attempts.length : 0;
  const solutionEfficiency = cap(
    optimal ? (optimal / Math.max(optimal, completedActions)) * 100 : 0,
  );
  const planningEfficiency = cap(
    100 - unnecessaryActions * 8 - resetActions * 6,
  );
  const highestDifficulty = Math.max(
    0,
    ...completed.map((attempt) => attempt.level),
  );
  const difficultyProgress = (highestDifficulty / 6) * 100;
  const times = completed.map((attempt) => attempt.completionTime);
  const meanTime = average(times);
  const consistency = cap(
    times.length < 2
      ? times.length
        ? 100
        : 0
      : 100 - average(times.map((time) => Math.abs(time - meanTime))) / 120,
  );
  const logicalReasoningScore = cap(
    successRate * 55 + solutionEfficiency * 0.3 + difficultyProgress * 0.15,
  );
  const problemSolvingScore = cap(
    successRate * 60 + solutionEfficiency * 0.25 + difficultyProgress * 0.15,
  );
  const planningScore = cap(
    planningEfficiency * 0.55 + solutionEfficiency * 0.45,
  );
  const workingMemoryScore = cap(
    successRate * 45 + consistency * 0.25 + planningEfficiency * 0.3,
  );
  const cognitiveFlexibilityScore = cap(
    difficultyProgress * 0.45 +
      successRate * 35 +
      Math.min(20, completed.length * 4),
  );
  const sequentialThinkingScore = cap(
    solutionEfficiency * 0.55 + successRate * 45,
  );
  const decisionMakingScore = cap(
    planningEfficiency * 0.55 + solutionEfficiency * 0.45,
  );
  const visualSpatialReasoningScore = cap(
    successRate * 55 + difficultyProgress * 0.25 + solutionEfficiency * 0.2,
  );
  const skills = [
    logicalReasoningScore,
    problemSolvingScore,
    planningScore,
    workingMemoryScore,
    cognitiveFlexibilityScore,
    sequentialThinkingScore,
    decisionMakingScore,
    visualSpatialReasoningScore,
  ];
  return {
    challengesAttempted: attempts.length,
    challengesCompleted: completed.length,
    targetsReached: completed.length,
    targetsMissed: Math.max(0, attempts.length - completed.length),
    totalActions,
    unnecessaryActions,
    solutionEfficiency,
    planningEfficiency,
    completionTime: Math.round(
      attempts.reduce((sum, attempt) => sum + attempt.completionTime, 0),
    ),
    highestDifficulty,
    failedAttempts: Math.max(0, attempts.length - completed.length),
    resetActions,
    consistency,
    logicalReasoningScore,
    problemSolvingScore,
    planningScore,
    workingMemoryScore,
    cognitiveFlexibilityScore,
    sequentialThinkingScore,
    decisionMakingScore,
    visualSpatialReasoningScore,
    overallScore: cap(average(skills)),
    completionStatus,
    attempts,
  };
}
