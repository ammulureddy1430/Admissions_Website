import type { RawTrafficMetrics } from "./Types";
export class FlexibilityScoringEngine { score(m: RawTrafficMetrics) { return m.rule_change_responses ? Math.round(100 * m.successful_adaptations / m.rule_change_responses) : 100; } }
