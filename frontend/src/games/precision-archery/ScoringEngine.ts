import { ArcheryMetrics, ShotRecord } from "./Types";
const cap = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
const avg = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export function scoreArchery(
  shots: ShotRecord[],
  highestDifficulty: number,
  duration: number,
): ArcheryMetrics {
  const hits = shots.filter((s) => s.ring !== "miss");
  const centers = shots.filter((s) => s.ring === "center").length;
  const aim = cap(100 - avg(shots.map((s) => s.aimError)) * 1.5);
  const stability = cap(100 - avg(shots.map((s) => s.aimVariance)) * 4);
  const force = cap(
    100 -
      Math.sqrt(
        avg(shots.map((s) => (s.force - avg(shots.map((x) => x.force))) ** 2)),
      ) *
        0.2,
  );
  const timing = cap(100 - avg(shots.map((s) => s.releaseTiming)) * 2);
  const precision = cap(
    (hits.length / Math.max(1, shots.length)) * 65 +
      (centers / Math.max(1, shots.length)) * 35,
  );
  const correction = cap(
    shots.length < 2
      ? 60
      : 100 -
          avg(
            shots
              .slice(1)
              .map((s, i) => Math.max(0, s.hitDistance - shots[i].hitDistance)),
          ) *
            2,
  );
  const visual = cap(
    aim * 0.24 +
      stability * 0.2 +
      precision * 0.18 +
      force * 0.13 +
      timing * 0.1 +
      correction * 0.15,
  );
  return {
    sessionDuration: duration,
    shotsTaken: shots.length,
    targetsHit: hits.length,
    targetMisses: shots.length - hits.length,
    centerHits: centers,
    outerHits: shots.filter((s) => s.ring === "outer").length,
    edgeHits: shots.filter((s) => s.ring === "edge").length,
    averageAimStability: stability,
    averageAimVariance: avg(shots.map((s) => s.aimVariance)),
    averageDrawConsistency: force,
    averageReleaseTiming: avg(shots.map((s) => s.releaseTiming)),
    averageForceVariance: 100 - force,
    trackingStability: stability,
    correctionEfficiency: correction,
    averageCorrectionTime: avg(shots.map((s) => s.correctionTime)),
    beginningPerformance: precision,
    middlePerformance: visual,
    endingPerformance: cap((visual + correction) / 2),
    highestDifficulty,
    visualMotorPrecisionScore: visual,
    handEyeCoordinationScore: cap((aim + precision) / 2),
    fineMotorControlScore: cap((stability + force) / 2),
    visualTrackingScore: stability,
    forceControlScore: force,
    timingScore: timing,
    precisionScore: precision,
    distanceEstimationScore: cap((aim + force) / 2),
    movementAdjustmentScore: correction,
    responseControlScore: timing,
    attentionTrackingScore: stability,
    errorCorrectionScore: correction,
    motorConsistencyScore: cap((stability + force + correction) / 3),
    overallScore: cap(visual * 0.7 + precision * 0.15 + correction * 0.15),
    completionStatus: "COMPLETED",
  };
}
