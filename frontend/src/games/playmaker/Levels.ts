import { LevelData } from "./Types";

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "Round 1: Open Pass",
    teammateCount: 1,
    defenderCount: 0,
    passesToComplete: 1, // Only 1 score needed to complete Round 1
    teammateRoutes: ["wing_cut_left"],
    teammateSpeedMultiplier: 0.25, // Move very slowly
    defenderGuardIds: [],
    defenderSpeedMultiplier: 0,
    defendersIntercept: false,
    defendersAdapt: false,
  },
  {
    id: 2,
    name: "Round 2: Choose Open Receiver",
    teammateCount: 2, // 2 options (A and B)
    defenderCount: 1, // Only 1 defender guarding teammate A, leaving B wide open!
    passesToComplete: 1, // Only 1 score needed to complete Round 2
    teammateRoutes: ["wing_cut_right", "v_cut_left"],
    teammateSpeedMultiplier: 0.35, // Move very slowly
    defenderGuardIds: ["teammate_0"],
    defenderSpeedMultiplier: 0.85,
    defendersIntercept: true,
    defendersAdapt: false,
  },
];
