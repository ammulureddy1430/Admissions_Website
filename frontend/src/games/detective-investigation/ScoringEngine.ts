import { DetectiveMetrics } from "./Types";

const cap = (value: number) => Math.round(Math.max(0, Math.min(100, value)));

export function scoreDetectiveInvestigation(raw: Omit<DetectiveMetrics,
  "evidenceBasedReasoningScore" | "observationScore" | "informationFilteringScore" |
  "logicalReasoningScore" | "evidenceComparisonScore" | "causeEffectReasoningScore" |
  "hypothesisFormationScore" | "informationIntegrationScore" | "workingRecallScore" |
  "relevantInformationAttentionScore" | "problemSolvingScore" | "adaptiveReasoningScore" |
  "decisionMakingScore" | "overallScore">): DetectiveMetrics {
  const relevantRate = raw.relevantEvidenceDiscovered / Math.max(1, raw.relevantEvidenceDiscovered + raw.relevantEvidenceIgnored) * 100;
  const connectionRate = raw.validEvidenceConnections / Math.max(1, raw.evidenceConnections) * 100;
  const filterRate = raw.relevantEvidenceDiscovered / Math.max(1, raw.evidenceDiscovered) * 100;
  const observationRate = raw.importantEventObservations / Math.max(1, raw.importantEventObservations + raw.missedImportantEvents) * 100;
  const evidenceBasedReasoningScore = cap(connectionRate * .45 + relevantRate * .35 + raw.caseResolution * .2);
  const observationScore = cap(observationRate * .7 + Math.min(100, raw.objectsInspected * 12) * .3);
  const informationFilteringScore = cap(filterRate * .7 + Math.max(0, 100 - raw.irrelevantEvidenceCollected * 12) * .3);
  const logicalReasoningScore = cap(connectionRate * .65 + raw.caseResolution * .35);
  const evidenceComparisonScore = cap(connectionRate * .7 + Math.min(100, raw.caseBoardInteractions * 12) * .3);
  const causeEffectReasoningScore = cap(connectionRate * .6 + Math.min(100, raw.timelineInformationObserved * 25) * .4);
  const hypothesisFormationScore = cap(Math.min(100, raw.hypothesesFormed * 55 + raw.hypothesisChanges * 20));
  const informationIntegrationScore = cap(connectionRate * .55 + relevantRate * .45);
  const workingRecallScore = cap(connectionRate * .5 + Math.min(100, raw.npcsInterviewed * 22) * .5);
  const relevantInformationAttentionScore = cap(relevantRate * .65 + observationRate * .35);
  const problemSolvingScore = cap(evidenceBasedReasoningScore * .7 + raw.explorationEfficiency * .3);
  const adaptiveReasoningScore = cap(raw.hypothesisChanges > 0 ? 90 : raw.hypothesesFormed > 0 ? 72 : 45);
  const decisionMakingScore = cap(connectionRate * .6 + Math.max(35, 100 - raw.averageDecisionTime * 5) * .4);
  const overallScore = cap(evidenceBasedReasoningScore * .28 + observationScore * .1 + informationFilteringScore * .1 + logicalReasoningScore * .1 + evidenceComparisonScore * .08 + causeEffectReasoningScore * .08 + hypothesisFormationScore * .07 + informationIntegrationScore * .07 + workingRecallScore * .04 + relevantInformationAttentionScore * .04 + problemSolvingScore * .02 + adaptiveReasoningScore * .01 + decisionMakingScore * .01);
  return { ...raw, evidenceBasedReasoningScore, observationScore, informationFilteringScore, logicalReasoningScore, evidenceComparisonScore, causeEffectReasoningScore, hypothesisFormationScore, informationIntegrationScore, workingRecallScore, relevantInformationAttentionScore, problemSolvingScore, adaptiveReasoningScore, decisionMakingScore, overallScore };
}
