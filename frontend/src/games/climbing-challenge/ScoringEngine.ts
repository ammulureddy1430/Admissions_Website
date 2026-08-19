import { ClimbingMetrics } from "./Types";

export function scoreClimbingChallenge(raw: Partial<ClimbingMetrics>): ClimbingMetrics {
  const sessionDuration = raw.sessionDuration || 1;
  const climbsStarted = raw.climbsStarted || 0;
  const climbsCompleted = raw.climbsCompleted || 0;
  const holdsReached = raw.holdsReached || 0;
  const holdsMissed = raw.holdsMissed || 0;
  const reachAttempts = raw.reachAttempts || 0;
  const successfulReaches = raw.successfulReaches || 0;
  const failedReaches = raw.failedReaches || 0;
  const movementAttempts = raw.movementAttempts || 0;
  const successfulMovements = raw.successfulMovements || 0;
  const movementCorrections = raw.movementCorrections || 0;
  const unnecessaryMovements = raw.unnecessaryMovements || 0;
  const routeChoices = raw.routeChoices || 0;
  const routeChanges = raw.routeChanges || 0;
  const multiStepSequences = raw.multiStepSequences || 0;
  const sequenceSuccesses = raw.sequenceSuccesses || 0;
  const sequenceErrors = raw.sequenceErrors || 0;
  const bodyRepositioningEvents = raw.bodyRepositioningEvents || 0;
  const successfulRepositioning = raw.successfulRepositioning || 0;
  const balanceEvents = raw.balanceEvents || 0;
  const recoveryEvents = raw.recoveryEvents || 0;
  const reachAccuracy = raw.reachAccuracy || 85;
  const movementAccuracy = raw.movementAccuracy || 85;
  const adaptiveEvents = raw.adaptiveEvents || 0;
  const successfulAdaptations = raw.successfulAdaptations || 0;
  const failedAdaptations = raw.failedAdaptations || 0;
  const averageDecisionTime = raw.averageDecisionTime || 1.2;
  const climbingSpeed = raw.climbingSpeed || 0;
  const beginningPerformance = raw.beginningPerformance || 80;
  const middlePerformance = raw.middlePerformance || 80;
  const endingPerformance = raw.endingPerformance || 80;
  const highestDifficulty = raw.highestDifficulty || 1;

  // 1. Motor Planning Score (25%)
  const reachSuccessRatio = reachAttempts > 0 ? (successfulReaches / reachAttempts) * 100 : 100;
  const backtrackPenalty = Math.max(30, 100 - movementCorrections * 12);
  const sequenceRatio = multiStepSequences > 0 ? (sequenceSuccesses / multiStepSequences) * 100 : 100;
  const motorPlanningScore = Math.round(0.4 * reachSuccessRatio + 0.3 * backtrackPenalty + 0.3 * sequenceRatio);

  // 2. Spatial-Motor Coordination Score (20%)
  const balanceStability = Math.max(40, 100 - balanceEvents * 7);
  const coordAccuracy = reachAccuracy;
  const recoveryEfficiency = Math.max(40, 100 - recoveryEvents * 8);
  const spatialMotorCoordinationScore = Math.round(0.3 * balanceStability + 0.4 * coordAccuracy + 0.3 * recoveryEfficiency);

  // 3. Visual-Spatial Reasoning Score (10%)
  const routeDiversity = Math.min(100, (routeChoices / Math.max(1, climbsStarted)) * 40 + 20);
  const reachEfficiency = holdsReached > 0 ? (holdsReached / Math.max(1, holdsReached + holdsMissed)) * 100 : 100;
  const visualSpatialReasoningScore = Math.round(0.4 * routeDiversity + 0.6 * reachEfficiency);

  // 4. Movement Sequencing Score (10%)
  const seqSuccessRatio = multiStepSequences > 0 ? (sequenceSuccesses / multiStepSequences) * 100 : 100;
  const seqErrorPenalty = Math.max(40, 100 - sequenceErrors * 15);
  const movementSequencingScore = Math.round(0.6 * seqSuccessRatio + 0.4 * seqErrorPenalty);

  // 5. Body-Position Awareness Score (10%)
  const repoRatio = bodyRepositioningEvents > 0 ? (successfulRepositioning / bodyRepositioningEvents) * 100 : 100;
  const balanceMaintain = Math.max(40, 100 - balanceEvents * 5);
  const bodyPositionAwarenessScore = Math.round(0.6 * repoRatio + 0.4 * balanceMaintain);

  // 6. Reach Planning Score (10%)
  const reachSuccess = reachAttempts > 0 ? (successfulReaches / reachAttempts) * 100 : 100;
  const unnecessaryPenalty = Math.max(40, 100 - unnecessaryMovements * 6);
  const reachPlanningScore = Math.round(0.5 * reachSuccess + 0.5 * unnecessaryPenalty);

  // 7. Precision Score (5%)
  const precisionScore = Math.round(0.5 * reachAccuracy + 0.5 * movementAccuracy);

  // 8. Visual Tracking Score (5%)
  const trackingAccuracy = holdsReached > 0 ? (holdsReached / Math.max(1, holdsReached + holdsMissed)) * 100 : 100;
  const missedHoldPenalty = Math.max(30, 100 - holdsMissed * 10);
  const visualTrackingScore = Math.round(0.6 * trackingAccuracy + 0.4 * missedHoldPenalty);

  // 9. Adaptive Motor Control Score (5%)
  const adaptRatio = adaptiveEvents > 0 ? (successfulAdaptations / adaptiveEvents) * 100 : 100;
  const adaptFailPenalty = Math.max(30, 100 - failedAdaptations * 15);
  const adaptiveMotorControlScore = Math.round(0.6 * adaptRatio + 0.4 * adaptFailPenalty);

  // 10. Decision Making Score (Secondary metrics)
  const decisionTimeScore = Math.max(40, Math.min(100, 100 - (averageDecisionTime - 0.9) * 18));
  const routePenalty = Math.max(50, 100 - routeChanges * 8);
  const decisionMakingScore = Math.round(0.6 * decisionTimeScore + 0.4 * routePenalty);

  // 11. Response Control Score (Secondary metrics)
  const responseControlScore = Math.max(40, Math.min(100, 100 - (unnecessaryMovements + holdsMissed) * 6));

  // Overall Score Calculation (Weights: Planning 25%, Coordination 20%, others 10% / 5%)
  const overallScore = Math.round(
    0.25 * motorPlanningScore +
    0.20 * spatialMotorCoordinationScore +
    0.10 * visualSpatialReasoningScore +
    0.10 * movementSequencingScore +
    0.10 * bodyPositionAwarenessScore +
    0.10 * reachPlanningScore +
    0.05 * precisionScore +
    0.05 * visualTrackingScore +
    0.05 * adaptiveMotorControlScore
  );

  return {
    sessionDuration,
    climbsStarted,
    climbsCompleted,
    holdsReached,
    holdsMissed,
    reachAttempts,
    successfulReaches,
    failedReaches,
    movementAttempts,
    successfulMovements,
    movementCorrections,
    unnecessaryMovements,
    routeChoices,
    routeChanges,
    multiStepSequences,
    sequenceSuccesses,
    sequenceErrors,
    bodyRepositioningEvents,
    successfulRepositioning,
    balanceEvents,
    recoveryEvents,
    reachAccuracy,
    movementAccuracy,
    adaptiveEvents,
    successfulAdaptations,
    failedAdaptations,
    averageDecisionTime,
    climbingSpeed,
    beginningPerformance,
    middlePerformance,
    endingPerformance,
    highestDifficulty,
    overallScore,
    motorPlanningScore,
    spatialMotorCoordinationScore,
    visualSpatialReasoningScore,
    movementSequencingScore,
    bodyPositionAwarenessScore,
    reachPlanningScore,
    precisionScore,
    visualTrackingScore,
    adaptiveMotorControlScore,
    decisionMakingScore,
    responseControlScore,
  };
}
