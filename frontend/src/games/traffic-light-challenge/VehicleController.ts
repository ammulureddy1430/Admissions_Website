import type { SignalColor, VehicleAction } from "./Types";
export class VehicleController {
  action(pressed: boolean, signal: SignalColor): VehicleAction { return pressed ? (signal === "yellow" ? "slow" : "move") : "stop"; }
  speed(action: VehicleAction) { return action === "move" ? 1 : action === "slow" ? .45 : 0; }
}
