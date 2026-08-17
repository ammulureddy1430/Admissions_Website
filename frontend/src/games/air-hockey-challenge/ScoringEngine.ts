import type { AirHockeyMetrics, RallyEvent } from "./Types";
const cap = (n: number) => Math.max(0, Math.min(100, Math.round(n))),
  avg = (v: number[]) =>
    v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
export function scoreAirHockey(
  e: RallyEvent[],
  base: Omit<
    AirHockeyMetrics,
    | "puckReturns"
    | "successfulInterceptions"
    | "missedInterceptions"
    | "averageResponseTime"
    | "averageMovementInitiationTime"
    | "averageInterceptionDistance"
    | "overshoots"
    | "undershoots"
    | "trackingConsistency"
    | "attentionConsistency"
    | "beginningPerformance"
    | "middlePerformance"
    | "endingPerformance"
    | "sustainedAttentionScore"
    | "visualAttentionScore"
    | "responseControlScore"
    | "anticipationScore"
    | "decisionMakingScore"
    | "inhibitoryControlScore"
    | "handEyeCoordinationScore"
    | "adaptiveResponseScore"
    | "processingSpeedScore"
    | "overallScore"
  >,
): AirHockeyMetrics {
  const returns = e.filter((x) => x.kind === "return"),
    miss = e.filter((x) => x.kind === "miss"),
    accuracy = returns.length / Math.max(1, returns.length + miss.length),
    third = Math.max(1, (base.sessionDuration * 1000) / 3),
    perf = (a: number, b: number) => {
      const s = e.filter((x) => x.at >= a && x.at < b);
      return cap(
        (s.filter((x) => x.kind === "return").length / Math.max(1, s.length)) *
          100,
      );
    },
    begin = perf(0, third),
    middle = perf(third, third * 2),
    end = perf(third * 2, Infinity),
    consistency = cap(
      100 - (Math.max(begin, middle, end) - Math.min(begin, middle, end)),
    ),
    response = avg(returns.map((x) => x.responseTime)),
    distance = avg(returns.map((x) => x.distance)),
    visual = cap(accuracy * 75 + consistency * 0.25),
    control = cap(
      100 - base.unnecessaryMovements * 3 - base.correctiveMovements * 1.5,
    ),
    anticipation = cap(100 - distance * 0.7),
    hand = cap(accuracy * 80 + anticipation * 0.2),
    adaptive = cap(65 + base.adaptationEvents * 2 - miss.length * 3),
    speed = cap(100 - Math.max(0, response - 900) / 20),
    sustained = cap(((begin + middle + end) / 3) * 0.7 + consistency * 0.3),
    decision = cap(visual * 0.5 + control * 0.5),
    inhibition = cap(
      100 - base.prematureMovements * 4 - base.unnecessaryMovements * 2,
    ),
    overall = cap(
      sustained * 0.2 +
        visual * 0.17 +
        control * 0.16 +
        anticipation * 0.14 +
        adaptive * 0.12 +
        decision * 0.08 +
        inhibition * 0.06 +
        hand * 0.05 +
        speed * 0.02,
    );
  return {
    ...base,
    puckReturns: returns.length,
    successfulInterceptions: returns.length,
    missedInterceptions: miss.length,
    averageResponseTime: Math.round(response),
    averageMovementInitiationTime: Math.round(response * 0.55),
    averageInterceptionDistance: Math.round(distance),
    overshoots: miss.filter((x) => x.distance > 60).length,
    undershoots: miss.filter((x) => x.distance <= 60).length,
    trackingConsistency: consistency,
    attentionConsistency: consistency,
    beginningPerformance: begin,
    middlePerformance: middle,
    endingPerformance: end,
    sustainedAttentionScore: sustained,
    visualAttentionScore: visual,
    responseControlScore: control,
    anticipationScore: anticipation,
    decisionMakingScore: decision,
    inhibitoryControlScore: inhibition,
    handEyeCoordinationScore: hand,
    adaptiveResponseScore: adaptive,
    processingSpeedScore: speed,
    overallScore: overall,
  };
}
