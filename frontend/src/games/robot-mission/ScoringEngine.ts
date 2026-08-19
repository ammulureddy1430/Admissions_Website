export function scoreRobotMission(raw: any) {
  const successRate = raw.missionsStarted ? raw.successfulMissions / raw.missionsStarted : 0;
  const accuracy = raw.commandsExecuted ? raw.usefulCommands / raw.commandsExecuted : 0;
  const efficiency = raw.commandsSelected ? raw.commandsExecuted / raw.commandsSelected : 0;
  const complexity = Math.min(1, raw.highestDifficulty / 7);
  const computationalThinkingScore = Math.round((successRate * .38 + accuracy * .27 + complexity * .2 + efficiency * .15) * 1000) / 10;
  const algorithmicReasoningScore = Math.round((accuracy * .38 + successRate * .32 + complexity * .2 + Math.min(1, raw.longestSuccessfulSequence / 10) * .1) * 1000) / 10;
  return { computationalThinkingScore, algorithmicReasoningScore, overallScore: Math.round((computationalThinkingScore + algorithmicReasoningScore) * 5) / 10, sequenceAccuracy: Math.round(accuracy * 1000) / 10, commandEfficiency: Math.round(efficiency * 1000) / 10 };
}
