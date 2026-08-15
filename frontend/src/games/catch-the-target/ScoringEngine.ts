import type { CatchEvent, CatchMetrics } from "./Types";
const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
export function scoreCatchGame(events: CatchEvent[], movementDistance: number, highestDifficulty: number, roundsCompleted: number, completionStatus: string): CatchMetrics {
  const targets = events.filter((event) => event.target); const distractors = events.filter((event) => !event.target);
  const caughtTargets = targets.filter((event) => event.caught); const caughtDistractors = distractors.filter((event) => event.caught);
  const targetRate = targets.length ? caughtTargets.length / targets.length * 100 : 0;
  const avoidance = distractors.length ? (distractors.length - caughtDistractors.length) / distractors.length * 100 : 100;
  const times = caughtTargets.map((event) => event.responseTime).filter((time) => time > 0);
  const responseTime = Math.round(avg(times));
  const consistency = cap(100 - avg(times.map((time) => Math.abs(time - responseTime))) / 8);
  const positioning = cap(100 - avg(caughtTargets.map((event) => event.horizontalDistance)) / 2);
  const movementEfficiency = cap(100 - Math.max(0, movementDistance - caughtTargets.length * 220) / 35);
  const speed = cap(100 - Math.max(0, responseTime - 350) / 10);
  const visualTrackingScore = cap(targetRate * .55 + positioning * .25 + consistency * .2);
  const handEyeCoordinationScore = cap(targetRate * .5 + positioning * .3 + movementEfficiency * .2);
  const selectiveAttentionScore = cap(targetRate * .55 + avoidance * .45);
  const sustainedAttentionScore = cap(targetRate * .5 + consistency * .5);
  const responseControlScore = cap(avoidance * .7 + movementEfficiency * .3);
  const processingSpeedScore = cap(speed * .65 + targetRate * .35);
  const visualDiscriminationScore = cap(avoidance * .6 + targetRate * .4);
  const accuracyScore = cap(targetRate * .65 + avoidance * .35);
  const skills = [visualTrackingScore, handEyeCoordinationScore, selectiveAttentionScore, sustainedAttentionScore, responseControlScore, processingSpeedScore, visualDiscriminationScore, accuracyScore];
  return { totalObjects: events.length, targetObjects: targets.length, targetsCaught: caughtTargets.length, targetsMissed: targets.length - caughtTargets.length, distractorsCaught: caughtDistractors.length, distractorsAvoided: distractors.length - caughtDistractors.length, catchAccuracy: cap(targetRate), targetDiscriminationAccuracy: cap((targetRate + avoidance) / 2), movementDistance: Math.round(movementDistance), movementEfficiency, responseTime, highestDifficulty, roundsCompleted, performanceConsistency: consistency, visualTrackingScore, handEyeCoordinationScore, selectiveAttentionScore, sustainedAttentionScore, responseControlScore, processingSpeedScore, visualDiscriminationScore, accuracyScore, overallScore: cap(avg(skills)), completionStatus, events };
}
