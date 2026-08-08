import type { RescueRawMetrics } from "./Types";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export class CognitiveFlexibilityScoringEngine {
  score(m: RescueRawMetrics) {
    const recovery = m.strategy_changes ? m.successful_strategy_changes / m.strategy_changes : (m.unsuccessful_actions ? 0 : 1);
    const variety = Math.min(1, new Set(m.scenario_types_completed).size / 5);
    const adaptationOpportunity = Math.min(1, (m.strategy_changes + new Set(m.scenario_types_completed).size) / 6);
    const difficulty = m.highest_difficulty / 6;
    return Math.round(clamp((recovery * .42 + variety * .28 + adaptationOpportunity * .18 + difficulty * .12) * 100) * 10) / 10;
  }
}
