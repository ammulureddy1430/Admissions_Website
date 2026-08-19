import { RacingStrategistMetrics } from "./Types";

const cap = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 80);

export function scoreRacingStrategist(
  raw: Omit<
    RacingStrategistMetrics,
    | "strategicDecisionMakingScore"
    | "riskAssessmentScore"
    | "anticipatoryReasoningScore"
    | "adaptiveDecisionMakingScore"
    | "routeSelectionScore"
    | "consequencePredictionScore"
    | "spatialJudgmentScore"
    | "planningScore"
    | "situationalAwarenessScore"
    | "responseControlScore"
    | "problemSolvingScore"
    | "decisionConsistencyScore"
    | "overallScore"
  >
): RacingStrategistMetrics {
  // 1. Strategic Decision Making (Primary)
  // Overtakes + Avoidance + Adaptations
  const overtakeSuccess = raw.overtakeAttempts > 0 ? (raw.successfulOvertakes / raw.overtakeAttempts) * 100 : 85;
  const avoidanceSuccess = raw.obstacleAvoidanceAttempts > 0 ? (raw.successfulObstacleAvoidance / raw.obstacleAvoidanceAttempts) * 100 : 90;
  const adaptationSuccess = raw.adaptiveDecisions > 0 ? (raw.successfulAdaptations / raw.adaptiveDecisions) * 100 : 85;
  const strategicDecisionMakingScore = cap(overtakeSuccess * 0.35 + avoidanceSuccess * 0.35 + adaptationSuccess * 0.30);

  // 2. Risk Assessment
  // Success rate on shortcuts + collision penalties
  const shortcutRate = raw.shortcutChoices > 0 ? (raw.shortcutSuccesses / raw.shortcutChoices) * 100 : 80;
  const riskAssessmentScore = cap(shortcutRate * 0.5 + Math.max(0, 100 - raw.collisions * 8) * 0.5);

  // 3. Anticipatory Reasoning
  // Appropriate braking vs late/unnecessary braking
  const totalBraking = raw.appropriateBrakingEvents + raw.lateBrakingEvents + raw.unnecessaryBrakingEvents;
  const appropriateBrakeRate = totalBraking > 0 ? (raw.appropriateBrakingEvents / totalBraking) * 100 : 85;
  const anticipatoryReasoningScore = cap(appropriateBrakeRate * 0.6 + Math.max(0, 100 - raw.lateBrakingEvents * 10) * 0.4);

  // 4. Adaptive Decision Making
  // Success on dynamic roadblocks and lane corrections
  const adaptiveDecisionMakingScore = cap(adaptationSuccess);

  // 5. Route Selection
  // Stability in choice, committing to forks
  const routeCommitment = raw.routeChoices > 0 ? Math.max(0, 100 - (raw.routeChanges / raw.routeChoices) * 40) : 90;
  const routeSelectionScore = cap(routeCommitment * 0.6 + Math.max(0, 100 - raw.collisions * 5) * 0.4);

  // 6. Consequence Prediction
  // Anticipating blocked paths (early lane shifts vs late responses)
  const totalAnticipation = raw.anticipatedEvents + raw.lateResponses;
  const anticipationRate = totalAnticipation > 0 ? (raw.anticipatedEvents / totalAnticipation) * 100 : 80;
  const consequencePredictionScore = cap(anticipationRate * 0.7 + Math.max(0, 100 - raw.lateResponses * 10) * 0.3);

  // 7. Spatial Judgment
  // Staying on track, keeping distance from obstacles/walls
  const spatialJudgmentScore = cap(Math.max(0, 100 - raw.collisions * 12 - raw.nearCollisions * 4));

  // 8. Planning
  // Progress on tracks + consistency
  const trackProgress = raw.tracksStarted > 0 ? (raw.tracksCompleted / raw.tracksStarted) * 100 : 100;
  const planningScore = cap(trackProgress * 0.6 + raw.decisionConsistency * 0.4);

  // 9. Situational Awareness
  // Overtake wait + obstacle avoidance + low near collisions
  const situationalAwarenessScore = cap(
    avoidanceSuccess * 0.5 +
    Math.max(0, 100 - raw.nearCollisions * 8) * 0.3 +
    Math.min(100, raw.overtakeWaitDecisions * 15) * 0.2
  );

  // 10. Response Control
  // Steering stability (low collision, low unnecessary braking)
  const responseControlScore = cap(Math.max(0, 100 - raw.collisions * 10 - raw.unnecessaryBrakingEvents * 5));

  // 11. Problem Solving
  // Successfully overcoming hurdles (obstacles + overtake blocks + blocked routes)
  const problemSolvingScore = cap(
    (raw.successfulObstacleAvoidance + raw.successfulOvertakes + raw.successfulAdaptations) /
    Math.max(1, raw.obstacleAvoidanceAttempts + raw.overtakeAttempts + raw.adaptiveDecisions) * 100
  );

  // 12. Decision Consistency
  const decisionConsistencyScore = cap(raw.decisionConsistency);

  // Calculate Overall Weighted Score (Primary = 30%, Secondary = 70% split)
  const overallScore = cap(
    strategicDecisionMakingScore * 0.30 +
    riskAssessmentScore * 0.10 +
    anticipatoryReasoningScore * 0.10 +
    adaptiveDecisionMakingScore * 0.10 +
    routeSelectionScore * 0.08 +
    consequencePredictionScore * 0.08 +
    spatialJudgmentScore * 0.06 +
    planningScore * 0.06 +
    situationalAwarenessScore * 0.04 +
    responseControlScore * 0.04 +
    problemSolvingScore * 0.04 +
    decisionConsistencyScore * 0.04
  );

  return {
    ...raw,
    strategicDecisionMakingScore,
    riskAssessmentScore,
    anticipatoryReasoningScore,
    adaptiveDecisionMakingScore,
    routeSelectionScore,
    consequencePredictionScore,
    spatialJudgmentScore,
    planningScore,
    situationalAwarenessScore,
    responseControlScore,
    problemSolvingScore,
    decisionConsistencyScore,
    overallScore,
  };
}
