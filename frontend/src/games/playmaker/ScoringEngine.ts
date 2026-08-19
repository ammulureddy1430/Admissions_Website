import { PlaymakerMetrics } from "./Types";

const cap = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

export function scorePlaymaker(
  raw: Omit<
    PlaymakerMetrics,
    | "overallScore"
    | "anticipationScore"
    | "decisionMakingScore"
    | "spatialPredictionScore"
    | "situationalAwarenessScore"
    | "selectiveAttentionScore"
    | "timingScore"
    | "responseControlScore"
    | "adaptabilityScore"
    | "passingStrategyScore"
    | "decisionConsistencyScore"
  >
): PlaymakerMetrics {
  // 1. Anticipation Score (Primary, 20% weight)
  const leadRatio = raw.leadPassAttempts > 0 ? raw.leadPassSuccesses / raw.leadPassAttempts : 0.8;
  const anticipationScore = cap(leadRatio * 50 + raw.receiverPredictionAccuracy * 0.5);

  // 2. Decision Making Score (Primary, 20% weight)
  const choiceRatio = raw.passTargetSelections > 0 ? raw.appropriateTargetSelections / raw.passTargetSelections : 0.85;
  const safetyRatio = raw.passesAttempted > 0 ? raw.safePasses / raw.passesAttempted : 0.85;
  const decisionMakingScore = cap(choiceRatio * 60 + safetyRatio * 40);

  // 3. Spatial Prediction (7.5% weight)
  const passCompletion = raw.passesAttempted > 0 ? raw.passesCompleted / raw.passesAttempted : 0.8;
  const laneAccuracy = (raw.passingLaneRecognitions + 1) / (raw.passingLaneRecognitions + raw.passingLaneErrors + 1);
  const spatialPredictionScore = cap(passCompletion * 50 + laneAccuracy * 50);

  // 4. Situational Awareness (7.5% weight)
  const interceptPenalty = Math.max(0, 100 - raw.passesIntercepted * 12);
  const detectionRatio = (raw.defensiveAdaptationsDetected + 1) / (raw.defensiveAdaptationsDetected + raw.defensiveAdaptationsMissed + 1);
  const situationalAwarenessScore = cap(interceptPenalty * 0.5 + detectionRatio * 50);

  // 5. Selective Attention (7.5% weight)
  const attentiveness = raw.selectiveAttentionEvents > 0
    ? ((raw.selectiveAttentionEvents - raw.distractorResponses) / raw.selectiveAttentionEvents) * 100
    : 85;
  const selectiveAttentionScore = cap(Math.max(40, Math.min(100, attentiveness)));

  // 6. Timing Score (7.5% weight)
  const totalTimed = raw.earlyPasses + raw.latePasses + raw.wellTimedPasses;
  const timingRatio = totalTimed > 0 ? raw.wellTimedPasses / totalTimed : 0.8;
  const timingScore = cap(timingRatio * 100);

  // 7. Response Control (7.5% weight)
  const outOfBoundsPenalty = Math.max(0, 100 - raw.passesOutOfBounds * 15);
  const decisionSpeedFactor = raw.averageDecisionTime > 1.2
    ? 90
    : raw.averageDecisionTime < 0.4
      ? 50 // panic passes are penalized
      : 80;
  const responseControlScore = cap(outOfBoundsPenalty * 0.6 + decisionSpeedFactor * 0.4);

  // 8. Adaptability Score (7.5% weight)
  const adaptRatio = raw.strategyChanges > 0 ? raw.successfulStrategyChanges / raw.strategyChanges : 0.8;
  const repeatFailedPenalty = Math.max(20, 100 - raw.repeatedFailedStrategyCount * 25);
  const adaptabilityScore = cap(adaptRatio * 50 + repeatFailedPenalty * 0.5);

  // 9. Passing Strategy Score (7.5% weight)
  const passingStrategyScore = cap((raw.passesCompleted / Math.max(1, raw.passesAttempted)) * 60 + (raw.safePasses / Math.max(1, raw.passesAttempted)) * 40);

  // 10. Decision Consistency Score (7.5% weight)
  const times = raw.decisionTimes || [];
  let consistency = 80;
  if (times.length > 1) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + Math.pow(b - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    // Lower standard deviation means more consistent timing
    consistency = Math.max(30, Math.min(100, Math.round(100 - stdDev * 35)));
  }
  const decisionConsistencyScore = cap(consistency);

  // Overall Weighted Score
  const overallScore = cap(
    anticipationScore * 0.20 +
    decisionMakingScore * 0.20 +
    spatialPredictionScore * 0.075 +
    situationalAwarenessScore * 0.075 +
    selectiveAttentionScore * 0.075 +
    timingScore * 0.075 +
    responseControlScore * 0.075 +
    adaptabilityScore * 0.075 +
    passingStrategyScore * 0.075 +
    decisionConsistencyScore * 0.075
  );

  return {
    ...raw,
    overallScore,
    anticipationScore,
    decisionMakingScore,
    spatialPredictionScore,
    situationalAwarenessScore,
    selectiveAttentionScore,
    timingScore,
    responseControlScore,
    adaptabilityScore,
    passingStrategyScore,
    decisionConsistencyScore,
  };
}
