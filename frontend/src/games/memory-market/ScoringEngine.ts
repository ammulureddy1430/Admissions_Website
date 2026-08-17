import type { MarketEvent, MemoryMarketMetrics } from "./Types";

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export function scoreMemoryMarket(
  events: MarketEvent[],
  base: Omit<
    MemoryMarketMetrics,
    | "ordersCompleted"
    | "correctItemsCollected"
    | "incorrectItemsCollected"
    | "incompleteDeliveries"
    | "extraItemDeliveries"
    | "orderRecallAccuracy"
    | "averageOrderCompletionTime"
    | "averagePickupDecisionTime"
    | "routeEfficiency"
    | "attentionConsistency"
    | "beginningPerformance"
    | "middlePerformance"
    | "endingPerformance"
    | "workingMemoryScore"
    | "planningScore"
    | "cognitiveFlexibilityScore"
    | "sequencingScore"
    | "decisionMakingScore"
    | "selectiveAttentionScore"
    | "sustainedAttentionScore"
    | "taskManagementScore"
    | "problemSolvingScore"
    | "overallScore"
  >,
): MemoryMarketMetrics {
  const pickups = events.filter((event) => event.kind === "pickup");
  const deliveries = events.filter((event) => event.kind === "delivery");
  const correct = pickups.filter((event) => event.correct).length;
  const incorrect = pickups.length - correct;
  const recall = correct / Math.max(1, pickups.length);
  const third = Math.max(1, (base.sessionDuration * 1000) / 3);
  const segment = (from: number, to: number) => {
    const values = pickups.filter((event) => event.at >= from && event.at < to);
    return cap(
      (values.filter((event) => event.correct).length /
        Math.max(1, values.length)) *
        100,
    );
  };
  const beginning = segment(0, third);
  const middle = segment(third, third * 2);
  const ending = segment(third * 2, Infinity);
  const consistency = cap(
    100 -
      (Math.max(beginning, middle, ending) -
        Math.min(beginning, middle, ending)),
  );
  const completionRate = deliveries.length / Math.max(1, base.ordersPresented);
  const routeEfficiency = cap(
    100 -
      Math.max(0, base.playerMovementDistance - deliveries.length * 540) / 35,
  );
  const workingMemory = cap(recall * 65 + completionRate * 35);
  const planning = cap(routeEfficiency * 0.65 + completionRate * 35);
  const flexibility = cap(55 + base.adaptationEvents * 7 - incorrect * 2);
  const sequencing = cap(completionRate * 75 + recall * 25);
  const decision = cap(70 + base.priorityDecisions * 3 - incorrect * 3);
  const selective = cap(recall * 100);
  const sustained = cap(
    ((beginning + middle + ending) / 3) * 0.7 + consistency * 0.3,
  );
  const taskManagement = cap(
    completionRate * 65 + Math.min(35, base.multipleCustomerEvents * 7),
  );
  const problemSolving = cap(55 + base.adaptationEvents * 8);
  const overall = cap(
    workingMemory * 0.25 +
      planning * 0.2 +
      flexibility * 0.16 +
      sequencing * 0.08 +
      decision * 0.07 +
      selective * 0.07 +
      sustained * 0.06 +
      taskManagement * 0.06 +
      problemSolving * 0.05,
  );
  return {
    ...base,
    ordersCompleted: deliveries.length,
    correctItemsCollected: correct,
    incorrectItemsCollected: incorrect,
    incompleteDeliveries: events.filter((event) => event.kind === "incomplete")
      .length,
    extraItemDeliveries: events.filter((event) => event.kind === "extra")
      .length,
    orderRecallAccuracy: cap(recall * 100),
    averageOrderCompletionTime: Math.round(
      average(deliveries.map((event) => event.responseTime)),
    ),
    averagePickupDecisionTime: Math.round(
      average(pickups.map((event) => event.responseTime)),
    ),
    routeEfficiency,
    attentionConsistency: consistency,
    beginningPerformance: beginning,
    middlePerformance: middle,
    endingPerformance: ending,
    workingMemoryScore: workingMemory,
    planningScore: planning,
    cognitiveFlexibilityScore: flexibility,
    sequencingScore: sequencing,
    decisionMakingScore: decision,
    selectiveAttentionScore: selective,
    sustainedAttentionScore: sustained,
    taskManagementScore: taskManagement,
    problemSolvingScore: problemSolving,
    overallScore: overall,
  };
}
