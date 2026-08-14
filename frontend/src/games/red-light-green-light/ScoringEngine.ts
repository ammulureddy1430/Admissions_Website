import type { RawRedLightGreenLightMetrics, RedLightGreenLightScores } from "./Types";

const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

export function scoreRedLightGreenLight(metrics: RawRedLightGreenLightMetrics): RedLightGreenLightScores {
  const {
    greenLightEvents,
    redLightEvents,
    correctStarts,
    correctStops,
    prematureMovements,
    averageStartReactionTime,
    averageStopReactionTime,
    progress,
    difficultyReached,
    completionStatus,
  } = metrics;

  const inhibitoryControlScore = clamp(
    (100 - Math.min(50, prematureMovements * 5)) * 0.6 +
      (redLightEvents ? (correctStops / redLightEvents) * 40 : 40),
  );
  const selfRegulationScore = clamp(
    ((correctStarts + correctStops) / Math.max(1, greenLightEvents + redLightEvents)) * 100,
  );
  const attentionScore = clamp(
    100 - Math.max(0, averageStartReactionTime - 400) / 10 - prematureMovements * 2,
  );
  const responseControlScore = clamp(
    100 -
      Math.max(0, averageStartReactionTime - 350) / 15 -
      Math.max(0, averageStopReactionTime - 350) / 15,
  );
  const followingInstructionsScore = selfRegulationScore;
  const sustainedAttentionScore = progress;
  const reactionControlScore = clamp(
    100 - Math.max(0, averageStopReactionTime - 350) / 10,
  );
  const consistencyScore = clamp(100 - prematureMovements * 4);

  const overallScore = clamp(
    (inhibitoryControlScore +
      selfRegulationScore +
      attentionScore +
      responseControlScore +
      followingInstructionsScore +
      sustainedAttentionScore +
      reactionControlScore +
      consistencyScore) /
      8,
  );

  return {
    ...metrics,
    inhibitoryControlScore,
    selfRegulationScore,
    attentionScore,
    responseControlScore,
    followingInstructionsScore,
    sustainedAttentionScore,
    reactionControlScore,
    consistencyScore,
    overallScore,
  };
}
