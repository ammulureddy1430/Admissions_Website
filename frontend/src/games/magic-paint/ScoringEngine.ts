import type { MagicPaintScores, RawMagicPaintMetrics } from "./Types";
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
export function scoreMagicPaint(raw: RawMagicPaintMetrics): MagicPaintScores {
  const averageCompletionTime = raw.completionTimes.length ? Math.round(raw.completionTimes.reduce((a,b)=>a+b,0) / raw.completionTimes.length) : 0;
  const averageInteractions = raw.interactionsPerObject.length ? raw.interactionsPerObject.reduce((a,b)=>a+b,0) / raw.interactionsPerObject.length : 0;
  const deviation = raw.interactionsPerObject.length ? raw.interactionsPerObject.reduce((sum,n)=>sum+Math.abs(n-averageInteractions),0)/raw.interactionsPerObject.length : 0;
  const interactionConsistency = clamp(100 - deviation * 12);
  const explorationLevel = clamp(raw.colorsUsed.length / 5 * 100);
  const completionPercentage = clamp(Math.min(1, raw.objectsCompleted / 5) * 100);
  const animationRate = raw.objectsCompleted ? raw.animationTriggerSuccess / raw.objectsCompleted * 100 : 0;
  const creativityScore = clamp(explorationLevel * .5 + completionPercentage * .3 + interactionConsistency * .2);
  const causeEffectScore = clamp(animationRate * .5 + completionPercentage * .3 + interactionConsistency * .2);
  return { ...raw, averageCompletionTime, interactionConsistency, explorationLevel, completionPercentage, creativityScore, causeEffectScore, overallScore: clamp((creativityScore + causeEffectScore) / 2), completionStatus: raw.objectsCompleted >= 5 || raw.elapsedSeconds >= 119 ? "COMPLETED" : "ENDED" };
}
