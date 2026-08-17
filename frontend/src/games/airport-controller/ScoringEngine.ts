import type { AirportMetrics, RouteEvent } from "./Types";
const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n))),
  avg = (a: number[]) =>
    a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
export function scoreAirport(
  e: RouteEvent[],
  base: Omit<
    AirportMetrics,
    | "planesCompleted"
    | "planesRouted"
    | "planesMisrouted"
    | "planesRedirected"
    | "priorityPlanesHandled"
    | "destinationMemoryErrors"
    | "averageRouteEfficiency"
    | "decisionTimes"
    | "averageDecisionTime"
    | "beginningPerformance"
    | "middlePerformance"
    | "endingPerformance"
    | "planningScore"
    | "dividedAttentionScore"
    | "taskSwitchingScore"
    | "decisionMakingScore"
    | "workingMemoryScore"
    | "prioritizationScore"
    | "cognitiveFlexibilityScore"
    | "problemSolvingScore"
    | "sustainedAttentionScore"
    | "overallScore"
  >,
): AirportMetrics {
  const routes = e.filter((x) => x.kind === "route"),
    complete = e.filter((x) => x.kind === "complete"),
    wrong = e.filter((x) => x.kind === "misroute"),
    redirect = e.filter((x) => x.kind === "redirect"),
    times = routes.map((x) => x.decisionTime),
    correct =
      routes.filter((x) => x.correct).length / Math.max(1, routes.length),
    third = Math.max(1, (base.sessionDuration * 1000) / 3),
    perf = (a: number, b: number) => {
      const s = routes.filter((x) => x.at >= a && x.at < b);
      return cap(
        (s.filter((x) => x.correct).length / Math.max(1, s.length)) * 100,
      );
    },
    begin = perf(0, third),
    middle = perf(third, third * 2),
    end = perf(third * 2, Infinity),
    consistency = cap(
      100 - (Math.max(begin, middle, end) - Math.min(begin, middle, end)),
    ),
    eff = avg(routes.map((x) => x.efficiency)),
    planning = cap(eff * 0.55 + correct * 45),
    divided = cap(
      correct * 65 +
        Math.min(35, base.highestDifficulty * 5) -
        base.routeConflicts * 3,
    ),
    switching = cap(65 + base.taskSwitches * 3 - base.abandonedTasks * 6),
    decision = cap(correct * 75 + eff * 0.25),
    memory = cap(100 - wrong.length * 8),
    priorityHandled = complete.filter((x) => x.priority).length,
    priority = cap(
      base.priorityPlanes ? (priorityHandled / base.priorityPlanes) * 100 : 75,
    ),
    flex = cap(60 + base.gateClosureAdaptations * 9 - base.gateConflicts * 4),
    problem = cap(65 + redirect.length * 5 - base.routeConflicts * 4),
    sustained = cap(((begin + middle + end) / 3) * 0.7 + consistency * 0.3),
    overall = cap(
      planning * 0.2 +
        divided * 0.18 +
        switching * 0.15 +
        decision * 0.14 +
        memory * 0.09 +
        priority * 0.07 +
        flex * 0.07 +
        problem * 0.05 +
        sustained * 0.05,
    );
  return {
    ...base,
    planesCompleted: complete.length,
    planesRouted: routes.length,
    planesMisrouted: wrong.length,
    planesRedirected: redirect.length,
    priorityPlanesHandled: priorityHandled,
    destinationMemoryErrors: wrong.length,
    averageRouteEfficiency: Math.round(eff),
    decisionTimes: times.map(Math.round),
    averageDecisionTime: Math.round(avg(times)),
    beginningPerformance: begin,
    middlePerformance: middle,
    endingPerformance: end,
    planningScore: planning,
    dividedAttentionScore: divided,
    taskSwitchingScore: switching,
    decisionMakingScore: decision,
    workingMemoryScore: memory,
    prioritizationScore: priority,
    cognitiveFlexibilityScore: flex,
    problemSolvingScore: problem,
    sustainedAttentionScore: sustained,
    overallScore: overall,
  };
}
