import type {
  CellType,
  Direction,
  MoveResult,
  Position,
  SokobanLevel,
  SokobanState,
} from "./Types";

const DELTA: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};
export const samePosition = (a: Position, b: Position) =>
  a.row === b.row && a.col === b.col;
const has = (positions: Position[], position: Position) =>
  positions.some((item) => samePosition(item, position));
const add = (position: Position, delta: Position) => ({
  row: position.row + delta.row,
  col: position.col + delta.col,
});

export function loadLevel(level: SokobanLevel): SokobanState {
  const walls: Position[] = [],
    goals: Position[] = [],
    boxes: Position[] = [];
  let player: Position | null = null;
  level.map.forEach((line, row) =>
    [...line].forEach((symbol, col) => {
      const position = { row, col };
      if (symbol === "#") walls.push(position);
      if (symbol === "." || symbol === "+" || symbol === "*")
        goals.push(position);
      if (symbol === "$" || symbol === "*") boxes.push(position);
      if (symbol === "@" || symbol === "+") player = position;
    }),
  );
  if (!player) throw new Error("Sokoban level requires one player");
  if (boxes.length !== goals.length)
    throw new Error("Sokoban boxes and goals must match");
  return {
    rows: level.map.length,
    cols: Math.max(...level.map.map((line) => line.length)),
    walls,
    goals,
    player,
    boxes,
    moves: 0,
    pushes: 0,
    blockedMoves: 0,
    unnecessaryPushes: 0,
    deadlocks: 0,
    completed: boxes.every((box) => has(goals, box)),
  };
}

export function cellAt(state: SokobanState, position: Position): CellType {
  const goal = has(state.goals, position),
    box = has(state.boxes, position);
  if (has(state.walls, position)) return "wall";
  if (samePosition(state.player, position))
    return goal ? "playerOnGoal" : "player";
  if (box) return goal ? "boxOnGoal" : "box";
  return goal ? "goal" : "floor";
}

export function isDeadlocked(state: SokobanState, box: Position) {
  if (has(state.goals, box)) return false;
  const wall = (row: number, col: number) => has(state.walls, { row, col });
  return (
    (wall(box.row - 1, box.col) || wall(box.row + 1, box.col)) &&
    (wall(box.row, box.col - 1) || wall(box.row, box.col + 1))
  );
}

export function movePlayer(
  state: SokobanState,
  direction: Direction,
): MoveResult {
  if (state.completed)
    return {
      state,
      moved: false,
      pushed: false,
      blocked: true,
      deadlock: false,
    };
  const next = add(state.player, DELTA[direction]);
  if (has(state.walls, next))
    return {
      state: { ...state, blockedMoves: state.blockedMoves + 1 },
      moved: false,
      pushed: false,
      blocked: true,
      deadlock: false,
    };
  const boxIndex = state.boxes.findIndex((box) => samePosition(box, next));
  if (boxIndex < 0)
    return {
      state: { ...state, player: next, moves: state.moves + 1 },
      moved: true,
      pushed: false,
      blocked: false,
      deadlock: false,
    };
  const beyond = add(next, DELTA[direction]);
  if (has(state.walls, beyond) || has(state.boxes, beyond))
    return {
      state: { ...state, blockedMoves: state.blockedMoves + 1 },
      moved: false,
      pushed: false,
      blocked: true,
      deadlock: false,
    };
  const boxes = state.boxes.map((box, index) =>
    index === boxIndex ? beyond : box,
  );
  const pushedState = {
    ...state,
    player: next,
    boxes,
    moves: state.moves + 1,
    pushes: state.pushes + 1,
  };
  const deadlock = isDeadlocked(pushedState, beyond);
  const completed = boxes.every((box) => has(state.goals, box));
  return {
    state: {
      ...pushedState,
      completed,
      deadlocks: state.deadlocks + (deadlock ? 1 : 0),
      unnecessaryPushes: state.unnecessaryPushes + (deadlock ? 1 : 0),
    },
    moved: true,
    pushed: true,
    blocked: false,
    deadlock,
  };
}

export const resetLevel = (level: SokobanLevel) => loadLevel(level);
export const timedOut = (remainingSeconds?: number) =>
  remainingSeconds !== undefined && remainingSeconds <= 0;
export const directionForKey = (key: string): Direction | null =>
  (({
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  })[key] as Direction | undefined) || null;
