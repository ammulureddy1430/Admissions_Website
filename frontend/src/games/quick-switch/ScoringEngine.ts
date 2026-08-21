import type { RawQuickSwitchMetrics, QuickSwitchScores } from "./Types";

const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

export function scoreQuickSwitch(metrics: RawQuickSwitchMetrics): QuickSwitchScores {
  const {
    totalInteractions,
    correctInteractions,
    incorrectInteractions,
    ruleChanges,
    switchingLatency,
    perseverativeErrors,
    postSwitchErrors,
    postSwitchAccuracy,
    adaptationTime,
    recoveryTime,
    responseConsistency,
    ruleMasteryTime,
    ruleSwitchSuccess,
    ruleSwitchFailure,
    attentionShiftEvents,
    taskSwitchEvents,
    completionStatus,
    ruleSpecificAnalytics,
  } = metrics;

  // 1. Rule Switching Score
  let ruleSwitchingScore = 100;
  if (ruleChanges > 0) {
    const latencyPenalty = switchingLatency > 0 ? Math.min(50, (switchingLatency / 5000) * 50) : 50;
    const successRate = ruleSwitchSuccess / Math.max(1, ruleChanges);
    ruleSwitchingScore = clamp(successRate * 50 + (50 - latencyPenalty));
  }

  // 2. Mental Set Shifting Score
  const mentalSetShiftingScore = clamp(100 - perseverativeErrors * 10);

  // 3. Attention Shifting Score
  const attentionShiftingScore = clamp(
    (attentionShiftEvents / Math.max(1, attentionShiftEvents + perseverativeErrors)) * 100
  );

  // 4. Error Recovery Score
  let errorRecoveryScore = 100;
  if (incorrectInteractions > 0) {
    const recoveryPenalty = recoveryTime > 0 ? Math.min(80, (recoveryTime / 8000) * 80) : 40;
    errorRecoveryScore = clamp(100 - recoveryPenalty);
  }

  // 5. Response Adaptation Score
  const responseAdaptationScore = clamp(
    postSwitchAccuracy * 0.7 + (100 - Math.min(30, responseConsistency / 10)) * 0.3
  );

  // 6. Processing Flexibility Score (specifically focuses on Rule 4: Moving vs. Stationary)
  let processingFlexibilityScore = postSwitchAccuracy; // default fallback
  const rule4 = ruleSpecificAnalytics.find((r) => r.ruleId === 4);
  if (rule4 && rule4.interactions > 0) {
    processingFlexibilityScore = clamp((rule4.correctInteractions / rule4.interactions) * 100);
  }

  // 7. Task Switching Score (cross-domain switches, e.g., color rules to shape rules, etc.)
  let taskSwitchingScore = postSwitchAccuracy; // default fallback
  const switchRules = ruleSpecificAnalytics.filter((r) => r.ruleId === 3 || r.ruleId === 4);
  const totalSwitchInteractions = switchRules.reduce((sum, r) => sum + r.interactions, 0);
  const totalSwitchCorrect = switchRules.reduce((sum, r) => sum + r.correctInteractions, 0);
  if (totalSwitchInteractions > 0) {
    taskSwitchingScore = clamp((totalSwitchCorrect / totalSwitchInteractions) * 100);
  }

  // 8. Adaptive Response Score
  const adaptiveResponseScore = clamp(postSwitchAccuracy);

  // 9. Cognitive Flexibility Score (Weighted average of core shifting and switching performance)
  const cognitiveFlexibilityScore = clamp(
    0.3 * ruleSwitchingScore +
      0.3 * mentalSetShiftingScore +
      0.2 * taskSwitchingScore +
      0.2 * errorRecoveryScore
  );

  // 10. Overall Score
  const overallScore = clamp(
    (cognitiveFlexibilityScore +
      ruleSwitchingScore +
      adaptiveResponseScore +
      mentalSetShiftingScore +
      attentionShiftingScore +
      errorRecoveryScore +
      responseAdaptationScore +
      processingFlexibilityScore +
      taskSwitchingScore) /
      9
  );

  return {
    ...metrics,
    cognitiveFlexibilityScore,
    ruleSwitchingScore,
    adaptiveResponseScore,
    mentalSetShiftingScore,
    attentionShiftingScore,
    errorRecoveryScore,
    responseAdaptationScore,
    processingFlexibilityScore,
    taskSwitchingScore,
    overallScore,
  };
}
