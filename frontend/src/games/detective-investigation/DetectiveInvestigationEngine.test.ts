import { MISSING_TROPHY_CASE } from "./Cases";
import { scoreDetectiveInvestigation } from "./ScoringEngine";

console.assert(MISSING_TROPHY_CASE.evidence.filter((item) => item.quality === "relevant").length >= 3, "Case needs multiple relevant evidence items");
console.assert(MISSING_TROPHY_CASE.evidence.some((item) => item.quality === "irrelevant"), "Case needs irrelevant information");
console.assert(MISSING_TROPHY_CASE.npcs.some((npc) => npc.contradiction), "Case needs a reproducible contradiction");
console.assert(MISSING_TROPHY_CASE.npcs.every((npc) => npc.path.length > 1), "Every NPC needs a deterministic movement path");

const strongResult = scoreDetectiveInvestigation({
  sessionDuration: 105, locationsVisited: 5, locationsRevisited: 1,
  objectsInspected: 5, objectsIgnored: 2, npcsApproached: 3,
  npcsInterviewed: 3, evidenceDiscovered: 5, evidenceInspected: 5,
  relevantEvidenceDiscovered: 3, irrelevantEvidenceCollected: 1,
  relevantEvidenceIgnored: 0, evidenceConnections: 2,
  validEvidenceConnections: 2, invalidEvidenceConnections: 0,
  eventObservations: 2, importantEventObservations: 2,
  missedImportantEvents: 0, timelineInformationObserved: 2,
  contradictionsObserved: 1, hypothesesFormed: 1, hypothesisChanges: 1,
  caseBoardInteractions: 4, caseResolution: 100, explorationEfficiency: 80,
  informationFiltering: 60, averageDecisionTime: 4, beginningPerformance: 70,
  middlePerformance: 85, endingPerformance: 95, highestDifficulty: 1,
  completionStatus: "CASE_FILED",
});
console.assert(strongResult.evidenceBasedReasoningScore >= 80, "Evidence-led solution should score strongly");
console.assert(strongResult.overallScore > 0 && strongResult.overallScore <= 100, "Overall score must be bounded");
