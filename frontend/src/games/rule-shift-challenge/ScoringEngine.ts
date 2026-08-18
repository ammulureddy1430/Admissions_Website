import { RuleShiftScores, RuleShiftMetrics, RuleMode, ObjectColor, ObjectShape, DecisionSide } from './Types';

export interface TrialEvent {
  timestamp: number;
  level: number;
  ruleVersion: number;
  ruleMode: RuleMode;
  color: ObjectColor;
  shape: ObjectShape;
  isDistractor: boolean;
  response: DecisionSide | null; // null for missed
  responseTime: number; // ms
  correct: boolean;
  isRuleChangeTrial: boolean;
  previousRuleMapping?: {
    mode: RuleMode;
    colorMapping?: Record<ObjectColor, DecisionSide>;
    shapeMapping?: Record<ObjectShape, DecisionSide>;
  };
}

export function scoreRuleShift(
  events: TrialEvent[],
  sessionDuration: number,
  highestDifficulty: number
): RuleShiftScores {
  const totalTrials = events.length;
  const targetTrials = events.filter((e) => !e.isDistractor);
  const validTrials = targetTrials.length;

  const correctResponses = targetTrials.filter((e) => e.correct && e.response !== null).length;
  const incorrectResponses = targetTrials.filter((e) => !e.correct && e.response !== null).length;
  const missedResponses = targetTrials.filter((e) => e.response === null).length;

  const responseTimes = targetTrials.filter((e) => e.correct && e.responseTime > 0).map((e) => e.responseTime);
  
  // RT aggregates
  const averageResponseTime = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;
  
  const sortedRTs = [...responseTimes].sort((a, b) => a - b);
  const medianResponseTime = sortedRTs.length
    ? sortedRTs[Math.floor(sortedRTs.length / 2)]
    : 0;
  const fastestResponseTime = sortedRTs.length ? sortedRTs[0] : 0;
  const slowestResponseTime = sortedRTs.length ? sortedRTs[sortedRTs.length - 1] : 0;

  // Rule shifts tracking
  const ruleChangesSet = new Set(events.map((e) => e.ruleVersion));
  const ruleChanges = Math.max(0, ruleChangesSet.size - 1);

  // Group events by rule version to inspect adaptation
  const ruleVersions = Array.from(ruleChangesSet).sort((a, b) => a - b);
  let ruleSwitchErrors = 0;
  let perseverativeErrors = 0;
  let postSwitchErrors = 0;
  let totalAdaptationTrials = 0;
  let totalAdaptationTime = 0;
  let adaptedRulesCount = 0;
  let ruleRetentionErrors = 0;

  // RT pre and post switch
  const preSwitchRTs: number[] = [];
  const postSwitchRTs: number[] = [];

  ruleVersions.forEach((version, idx) => {
    const trialsInRule = events.filter((e) => e.ruleVersion === version && !e.isDistractor);
    if (!trialsInRule.length) return;

    // Check if this was a shifted rule (not the first one)
    if (idx > 0) {
      // Find previous rule mapping for checking perseveration
      const prevRule = events.find((e) => e.ruleVersion === version - 1);
      
      // Look at the first 3 trials of the new rule
      const firstThree = trialsInRule.slice(0, 3);
      firstThree.forEach((trial) => {
        if (!trial.correct) {
          postSwitchErrors++;
          ruleSwitchErrors++;

          // Check if error is perseverative (using the old rule)
          if (trial.response !== null && trial.previousRuleMapping) {
            let correctInOld: DecisionSide | undefined;
            if (
              (trial.previousRuleMapping.mode === 'color' || trial.previousRuleMapping.mode === 'reverseColor') &&
              trial.previousRuleMapping.colorMapping
            ) {
              correctInOld = trial.previousRuleMapping.colorMapping[trial.color];
            } else if (
              trial.previousRuleMapping.mode === 'shape' &&
              trial.previousRuleMapping.shapeMapping
            ) {
              correctInOld = trial.previousRuleMapping.shapeMapping[trial.shape];
            }
            if (trial.response === correctInOld) {
              perseverativeErrors++;
            }
          }

        } else {
          postSwitchRTs.push(trial.responseTime);
        }
      });

      // Measure adaptation speed: trials before first correct response
      const firstCorrectIndex = trialsInRule.findIndex((trial) => trial.correct);
      if (firstCorrectIndex !== -1) {
        totalAdaptationTrials += firstCorrectIndex;
        // Sum response times up to first correct
        const prepTime = trialsInRule.slice(0, firstCorrectIndex + 1).reduce((acc, t) => acc + t.responseTime, 0);
        totalAdaptationTime += prepTime;
        adaptedRulesCount++;
      } else {
        totalAdaptationTrials += trialsInRule.length;
        totalAdaptationTime += trialsInRule.reduce((acc, t) => acc + t.responseTime, 0);
      }

      // Retention errors: errors made on trials 4+ of the same rule
      const retentionTrials = trialsInRule.slice(3);
      retentionTrials.forEach((trial) => {
        if (!trial.correct) {
          ruleRetentionErrors++;
        }
      });
    }

    // Capture RT from last 3 trials of previous rule
    if (idx < ruleVersions.length - 1) {
      const lastThree = trialsInRule.slice(-3);
      lastThree.forEach((t) => {
        if (t.correct) preSwitchRTs.push(t.responseTime);
      });
    }
  });

  const adaptationTrials = adaptedRulesCount ? Math.round(totalAdaptationTrials / adaptedRulesCount) : 0;
  const adaptationTime = adaptedRulesCount ? Math.round(totalAdaptationTime / adaptedRulesCount) : 0;

  // Switch cost: RT post-switch minus RT pre-switch
  const avgPreSwitchRT = preSwitchRTs.length ? preSwitchRTs.reduce((a, b) => a + b, 0) / preSwitchRTs.length : 0;
  const avgPostSwitchRT = postSwitchRTs.length ? postSwitchRTs.reduce((a, b) => a + b, 0) / postSwitchRTs.length : 0;
  const switchCost = Math.max(0, Math.round(avgPostSwitchRT - avgPreSwitchRT));

  // Mode specific errors
  const shapeRuleErrors = targetTrials.filter((e) => e.ruleMode === 'shape' && !e.correct).length;
  const colorRuleErrors = targetTrials.filter((e) => e.ruleMode === 'color' && !e.correct).length;
  const reverseRuleErrors = targetTrials.filter((e) => e.ruleMode === 'reverseColor' && !e.correct).length;
  const combinationRuleErrors = targetTrials.filter((e) => e.ruleMode === 'combination' && !e.correct).length;

  // Distractors
  const distractorTrials = events.filter((e) => e.isDistractor);
  const distractorErrors = distractorTrials.filter((e) => e.response !== null).length;

  // Task switches: color ➔ shape or shape ➔ color
  let taskSwitches = 0;
  let successfulTaskSwitches = 0;
  let failedTaskSwitches = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i].ruleMode !== events[i - 1].ruleMode && !events[i].isDistractor) {
      taskSwitches++;
      // Analyze performance on first 3 trials after this task switch
      const switchVersion = events[i].ruleVersion;
      const firstThreeAfterSwitch = events.filter((e) => e.ruleVersion === switchVersion && !e.isDistractor).slice(0, 3);
      const errors = firstThreeAfterSwitch.filter((e) => !e.correct).length;
      if (errors <= 1) {
        successfulTaskSwitches++;
      } else {
        failedTaskSwitches++;
      }
    }
  }

  // Performance over time (thirds of total trials)
  const third = Math.floor(events.length / 3);
  const beginningEvents = targetTrials.slice(0, third);
  const middleEvents = targetTrials.slice(third, third * 2);
  const endingEvents = targetTrials.slice(third * 2);

  const getAccuracy = (evs: TrialEvent[]) =>
    evs.length ? Math.round((evs.filter((e) => e.correct).length / evs.length) * 100) : 0;
  const getAvgRT = (evs: TrialEvent[]) => {
    const rts = evs.filter((e) => e.correct).map((e) => e.responseTime);
    return rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
  };

  const beginningAccuracy = getAccuracy(beginningEvents);
  const middleAccuracy = getAccuracy(middleEvents);
  const endingAccuracy = getAccuracy(endingEvents);

  const beginningResponseTime = getAvgRT(beginningEvents);
  const middleResponseTime = getAvgRT(middleEvents);
  const endingResponseTime = getAvgRT(endingEvents);

  // Skill Score formulation (clamped between 0 and 100)
  const clamp = (val: number) => Math.max(0, Math.min(100, val));

  const cognitiveFlexibilityScore = clamp(
    100 - (ruleSwitchErrors * 4) - (adaptationTrials * 8) + (successfulTaskSwitches * 6)
  );

  const inhibitoryControlScore = clamp(
    100 - (perseverativeErrors * 10) - (distractorErrors * 15)
  );

  const selectiveAttentionScore = clamp(
    100 - (distractorErrors * 20) - (missedResponses * 5)
  );

  const workingMemoryScore = clamp(
    100 - (ruleRetentionErrors * 12) - (postSwitchErrors * 3)
  );

  const taskSwitchingScore = clamp(
    100 - (failedTaskSwitches * 25) - (switchCost > 50 ? (switchCost - 50) / 10 : 0)
  );

  const processingSpeedScore = clamp(
    averageResponseTime > 0
      ? 100 - Math.max(0, (averageResponseTime - 450) / 12)
      : 0
  );

  const sustainedAttentionScore = clamp(
    100 - Math.abs(beginningAccuracy - endingAccuracy) * 1.5 -
    (endingResponseTime > beginningResponseTime ? (endingResponseTime - beginningResponseTime) / 15 : 0)
  );

  const ruleLearningScore = clamp(
    validTrials > 0
      ? (correctResponses / validTrials) * 100
      : 0
  );

  const adaptationScore = clamp(
    100 - (adaptationTrials * 15) - (adaptationTime > 1000 ? (adaptationTime - 1000) / 100 : 0)
  );

  // Primary scores overall blend
  const overallScore = Math.round(
    cognitiveFlexibilityScore * 0.25 +
    inhibitoryControlScore * 0.20 +
    workingMemoryScore * 0.15 +
    taskSwitchingScore * 0.15 +
    selectiveAttentionScore * 0.10 +
    sustainedAttentionScore * 0.10 +
    processingSpeedScore * 0.05
  );

  const completionStatus = sessionDuration >= 115 ? 'COMPLETED' : 'INCOMPLETE';

  return {
    sessionDuration,
    totalTrials,
    validTrials,
    correctResponses,
    incorrectResponses,
    missedResponses,
    responseTimes,
    averageResponseTime,
    medianResponseTime,
    fastestResponseTime,
    slowestResponseTime,
    ruleChanges,
    ruleChangeTrials: ruleSwitchErrors + postSwitchErrors, // standard proxy
    ruleSwitchErrors,
    perseverativeErrors,
    postSwitchErrors,
    adaptationTrials,
    adaptationTime,
    switchCost,
    ruleRetentionErrors,
    shapeRuleErrors,
    colorRuleErrors,
    reverseRuleErrors,
    combinationRuleErrors,
    distractorErrors,
    taskSwitches,
    successfulTaskSwitches,
    failedTaskSwitches,
    beginningAccuracy,
    middleAccuracy,
    endingAccuracy,
    beginningResponseTime,
    middleResponseTime,
    endingResponseTime,
    highestDifficulty,
    completionStatus,
    cognitiveFlexibilityScore,
    inhibitoryControlScore,
    selectiveAttentionScore,
    workingMemoryScore,
    taskSwitchingScore,
    processingSpeedScore,
    sustainedAttentionScore,
    ruleLearningScore,
    adaptationScore,
    overallScore,
  };
}
