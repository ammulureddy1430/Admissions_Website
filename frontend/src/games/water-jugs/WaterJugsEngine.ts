import type { JugAction, JugState, WaterJugsChallenge } from "./Types";

export const CHALLENGES: WaterJugsChallenge[] = [
  {
    id: 1,
    level: 1,
    capacities: [2, 4],
    targetJug: 1,
    targetAmount: 2,
    optimalActions: 2,
  },
  {
    id: 2,
    level: 2,
    capacities: [3, 5],
    targetJug: 1,
    targetAmount: 2,
    optimalActions: 2,
  },
  {
    id: 3,
    level: 3,
    capacities: [1, 5],
    targetJug: 1,
    targetAmount: 4,
    optimalActions: 2,
  },
  {
    id: 4,
    level: 4,
    capacities: [2, 3, 5],
    targetJug: 2,
    targetAmount: 4,
    optimalActions: 4,
  },
];

export const createJugs = (capacities: number[]): JugState[] =>
  capacities.map((capacity) => ({ capacity, amount: 0 }));

export function applyJugAction(
  jugs: JugState[],
  action: JugAction,
): JugState[] {
  if (action.type === "reset")
    return createJugs(jugs.map((jug) => jug.capacity));
  const next = jugs.map((jug) => ({ ...jug }));
  if (action.type === "fill")
    next[action.jug].amount = next[action.jug].capacity;
  if (action.type === "empty") next[action.jug].amount = 0;
  if (action.type === "pour") {
    const room = next[action.to].capacity - next[action.to].amount;
    const transfer = Math.min(next[action.from].amount, room);
    next[action.from].amount -= transfer;
    next[action.to].amount += transfer;
  }
  return next;
}

export function isUnnecessaryAction(jugs: JugState[], action: JugAction) {
  if (action.type === "reset") return jugs.every((jug) => jug.amount === 0);
  if (action.type === "fill")
    return jugs[action.jug].amount === jugs[action.jug].capacity;
  if (action.type === "empty") return jugs[action.jug].amount === 0;
  return (
    action.from === action.to ||
    jugs[action.from].amount === 0 ||
    jugs[action.to].amount === jugs[action.to].capacity
  );
}

export const targetReached = (
  jugs: JugState[],
  challenge: WaterJugsChallenge,
) => jugs[challenge.targetJug]?.amount === challenge.targetAmount;

export const difficultyForChallenge = (completed: number) =>
  Math.min(CHALLENGES.length, completed + 1);

export const timedOut = (remainingSeconds?: number) =>
  remainingSeconds !== undefined && remainingSeconds <= 0;
