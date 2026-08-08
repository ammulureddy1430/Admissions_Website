import type { Carriage } from "./Types";
export class CarriageManager {
  matches(expected: Carriage, selected: Carriage) { return expected.token === selected.token && expected.color === selected.color && expected.kind === selected.kind; }
}
