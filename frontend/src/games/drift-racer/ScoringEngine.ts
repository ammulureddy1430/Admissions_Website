export type DriftMetrics = Record<string, number | string>;

const s = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

export function scoreDriftRacer(m: DriftMetrics): DriftMetrics {
  const duration = Math.max(1, Number(m.sessionDuration));

  // 1. Steering Control Score
  // Subtract points for excessive corrections, high magnitude oversteering/understeering, and boundary hits
  const steeringChanges = Number(m.steeringChanges || 0);
  const steeringCorrections = Number(m.steeringCorrections || 0);
  const oversteerEvents = Number(m.oversteerEvents || 0);
  const trackBoundaryHits = Number(m.trackBoundaryHits || 0);

  const steerFrequency = steeringChanges / duration;
  const steerCorrectionPenalty = steeringCorrections * 1.5;
  const oversteerPenalty = oversteerEvents * 4.5;
  
  const steeringControlScore = s(100 - steerCorrectionPenalty - oversteerPenalty - (steerFrequency > 3.0 ? 15 : 0));

  // 2. Movement Precision Score
  // Focuses on collision avoidance and staying within boundaries
  const obstacleCollisions = Number(m.obstacleCollisions || 0);
  const movementPrecisionScore = s(100 - trackBoundaryHits * 5.0 - obstacleCollisions * 8.5);

  // 3. Drift Control Score
  // Ratio of successful corner drifts versus total drift events
  const driftCount = Number(m.driftCount || 0);
  const successfulCornerDrifts = Number(m.successfulCornerDrifts || 0);
  const driftOvercorrectionCount = Number(m.driftOvercorrectionCount || 0);
  
  let driftControlScore = 50; // Neutral baseline if no drifts are attempted
  if (driftCount > 0) {
    const successRatio = successfulCornerDrifts / driftCount;
    driftControlScore = s(successRatio * 100 - driftOvercorrectionCount * 5.0);
  }

  // 4. Adaptive Control Score (Surface Adaptation)
  // How fast the student stabilizes the car when grip/surface changes
  const surfaceChanges = Number(m.surfaceChanges || 1);
  const surfaceRecoveryTime = Number(m.surfaceRecoveryTime || 0);
  const spinCount = Number(m.spinCount || 0);
  const adaptationTime = Number(m.adaptationTime || 0);

  const avgRecoveryTime = surfaceRecoveryTime / Math.max(1, surfaceChanges);
  const adaptiveControlScore = s(100 - avgRecoveryTime * 8.0 - spinCount * 12.0 - adaptationTime * 1.2);

  // 5. Error Correction Score
  // Measures recovering control relative to total errors (spins + boundary crashes)
  const recoveryCount = Number(m.recoveryCount || 0);
  const totalCrashes = spinCount + trackBoundaryHits;
  const errorCorrectionScore = totalCrashes > 0 ? s((recoveryCount / totalCrashes) * 100) : 100;

  // 6. Spatial Awareness Score
  // Measures obstacle avoidance rate
  const obstacleCollisionsCount = Number(m.obstacleCollisions || 0);
  const obstaclesEncountered = Math.max(1, obstacleCollisionsCount + Number(m.successfulCornerDrifts || 0)); // Proxy for obstacles encountered
  const spatialAwarenessScore = s(((obstaclesEncountered - obstacleCollisionsCount) / obstaclesEncountered) * 100);

  // 7. Track Awareness Score
  // Measures staying on path and completing laps
  const lapsCompleted = Number(m.lapsCompleted || 0);
  const offTrackDuration = Number(m.offTrackDuration || 0);
  const trackAwarenessScore = s(100 - (offTrackDuration / duration) * 100 + lapsCompleted * 10.0);

  // 8. Secondary Score combinations
  const dynamicMotorControlScore = s((steeringControlScore + driftControlScore + adaptiveControlScore) / 3);
  const continuousAdjustmentScore = s(Number(m.controlConsistency || 85));
  const motorCoordinationScore = s((steeringControlScore + movementPrecisionScore) / 2);
  const movementConsistencyScore = s(Number(m.movementConsistency || 85));
  const responseControlScore = s(100 - driftOvercorrectionCount * 6.0);

  // 9. Primary/Overall assessment score
  const motorControlAdaptationScore = s(
    steeringControlScore * 0.22 +
    movementPrecisionScore * 0.18 +
    adaptiveControlScore * 0.18 +
    driftControlScore * 0.16 +
    errorCorrectionScore * 0.14 +
    spatialAwarenessScore * 0.12
  );

  return {
    ...m,
    overallScore: motorControlAdaptationScore,
    motorControlAdaptationScore,
    dynamicMotorControlScore,
    steeringControlScore,
    movementPrecisionScore,
    continuousAdjustmentScore,
    motorCoordinationScore,
    adaptiveControlScore,
    spatialAwarenessScore,
    errorCorrectionScore,
    movementConsistencyScore,
    responseControlScore,
    trackAwarenessScore,
  };
}
