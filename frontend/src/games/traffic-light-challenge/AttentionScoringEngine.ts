import type { RawTrafficMetrics } from "./Types";
export class AttentionScoringEngine { score(m: RawTrafficMetrics) { return Math.round(100 * m.correct_responses / Math.max(1, m.signals_presented)); } }
