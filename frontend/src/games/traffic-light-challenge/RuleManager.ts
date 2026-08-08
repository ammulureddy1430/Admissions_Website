import type { RuleSet, SignalColor, VehicleAction } from "./Types";
export class RuleManager {
  expected(signal: SignalColor, rules: RuleSet): VehicleAction {
    if (rules === "reversed") return signal === "red" ? "move" : signal === "green" ? "stop" : "slow";
    if (rules === "yellow-stop" && signal === "yellow") return "stop";
    return signal === "green" ? "move" : signal === "yellow" ? "slow" : "stop";
  }
}
