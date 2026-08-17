import type { ColorShiftMetrics, ShiftEvent } from "./Types";
const cap = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const avg = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
export function scoreColorShift(events: ShiftEvent[], sessionDuration: number, objectsSpawned: number, ruleSwitches: number, highestDifficulty: number, status: string): ColorShiftMetrics {
  const collected = events.filter(e => e.kind === "target"), distractors = events.filter(e => e.kind === "distractor"), missed = events.filter(e => e.kind === "miss");
  const post = events.filter(e => e.afterSwitch), old = post.filter(e => e.oldRuleResponse);
  const decisions = Math.max(1, events.length), accuracy = collected.length / decisions;
  const latencies = collected.map(e => e.responseTime), mean = avg(latencies);
  const consistency = cap(100 - avg(latencies.map(v => Math.abs(v - mean))) / 18);
  const flexibility = cap(100 - old.length * 9 - (post.length ? old.length / post.length * 35 : 0) + ruleSwitches * 3);
  const inhibition = cap(100 - distractors.length / decisions * 120 - old.length * 5);
  const attention = cap(accuracy * 72 + (1 - missed.length / decisions) * 28);
  const sustained = cap(attention * .72 + consistency * .28);
  const working = cap(flexibility * .65 + attention * .35);
  const visual = cap(100 - (distractors.length + missed.length) / decisions * 100);
  const decision = cap(accuracy * 65 + inhibition * .35);
  const speed = cap(100 - Math.max(0, mean - 900) / 28);
  const adaptation = post.filter(e => e.kind === "target").map(e => e.at).slice(0, ruleSwitches);
  const overall = cap(flexibility * .27 + inhibition * .2 + attention * .17 + sustained * .09 + working * .12 + decision * .1 + speed * .05);
  return { sessionDuration: Math.round(sessionDuration), objectsSpawned, objectsCollected: collected.length, distractorsTouched: distractors.length, validTargetsMissed: missed.length, ruleSwitches, postSwitchErrors: old.length, postSwitchAdaptationTime: Math.round(avg(adaptation)), oldRuleResponsesAfterSwitch: old.length, newRuleResponsesAfterSwitch: post.filter(e => e.kind === "target").length, averageResponseTime: Math.round(mean), responseConsistency: consistency, highestDifficulty, cognitiveFlexibilityScore: flexibility, inhibitoryControlScore: inhibition, selectiveAttentionScore: attention, sustainedAttentionScore: sustained, workingMemoryScore: working, visualDiscriminationScore: visual, decisionMakingScore: decision, processingSpeedScore: speed, overallScore: overall, completionStatus: status };
}
