export type StealthMetrics = Record<string, number | string | boolean>;
const s = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
export function scoreStealth(m: StealthMetrics): StealthMetrics {
  const detections = Number(m.fullDetectionCount || 0),
    unnecessary = Number(m.unnecessaryReactions || 0),
    ignored = Number(m.ignoredIrrelevantEvents || 0),
    responses = Number(m.respondedRelevantEvents || 0),
    wait = Number(m.waitCount || 0),
    control = s(100 - detections * 18 - unnecessary * 7 + ignored * 3 + wait),
    attention = s(55 + responses * 8 + ignored * 4 - detections * 9),
    movement = s(100 - Number(m.unnecessaryMovement || 0) * 3),
    adapt = s(
      60 +
        Number(m.recoveryCount || 0) * 8 -
        Number(m.nearDetectionCount || 0) * 3,
    ),
    inhibitoryControlScore = s(
      control * 0.55 + attention * 0.25 + movement * 0.2,
    );
  return {
    ...m,
    inhibitoryControlScore,
    selectiveAttentionScore: attention,
    responseControlScore: control,
    situationalAwarenessScore: s((attention + adapt) / 2),
    visualTrackingScore: attention,
    spatialAwarenessScore: s(100 - detections * 12),
    impulseControlScore: control,
    adaptiveDecisionMakingScore: adapt,
    concentrationScore: s((control + attention) / 2),
    environmentalMonitoringScore: attention,
    movementControlScore: movement,
    overallScore: inhibitoryControlScore,
  };
}
