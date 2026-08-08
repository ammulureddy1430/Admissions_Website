import type { RuleSet } from "./Types";
export class RuleChangeManager {
  forLevel(level: number): RuleSet { return level >= 6 ? "yellow-stop" : level >= 4 ? "reversed" : "normal"; }
  changesAt(level: number) { return level === 4 || level === 6; }
}
