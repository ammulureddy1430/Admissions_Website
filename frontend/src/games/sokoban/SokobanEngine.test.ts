import test from "node:test";
import assert from "node:assert/strict";
import { SOKOBAN_LEVELS } from "./Levels";
import {
  cellAt,
  directionForKey,
  isDeadlocked,
  loadLevel,
  movePlayer,
  resetLevel,
  timedOut,
} from "./SokobanEngine";
import { scoreSokoban } from "./ScoringEngine";
import type { Direction, SokobanAttempt, SokobanState } from "./Types";

const directions: Direction[] = ["up", "down", "left", "right"];
const attempt = (changes: Partial<SokobanAttempt> = {}): SokobanAttempt => ({
  levelId: 1,
  difficulty: 1,
  completed: true,
  moves: 1,
  pushes: 1,
  unnecessaryMoves: 0,
  unnecessaryPushes: 0,
  deadlocks: 0,
  resets: 0,
  optimalMoves: 1,
  completionTime: 3000,
  ...changes,
});
const key = (state: SokobanState) =>
  `${state.player.row},${state.player.col}|${state.boxes
    .map((box) => `${box.row},${box.col}`)
    .sort()
    .join(";")}`;
function solvable(initial: SokobanState) {
  const queue = [initial],
    seen = new Set([key(initial)]);
  while (queue.length && seen.size < 100000) {
    const state = queue.shift()!;
    if (state.completed) return true;
    for (const direction of directions) {
      const next = movePlayer(state, direction).state;
      const id = key(next);
      if (!seen.has(id)) {
        seen.add(id);
        queue.push(next);
      }
    }
  }
  return false;
}

test("board initializes with typed dimensions", () => {
  const state = loadLevel(SOKOBAN_LEVELS[0]);
  assert.equal(state.rows, 3);
  assert.equal(state.cols, 5);
});
test("player initializes exactly once", () => {
  const state = loadLevel(SOKOBAN_LEVELS[0]);
  assert.deepEqual(state.player, { row: 1, col: 1 });
});
test("boxes initialize from level symbols", () => {
  assert.deepEqual(loadLevel(SOKOBAN_LEVELS[0]).boxes, [{ row: 1, col: 2 }]);
});
test("goals initialize from level symbols", () => {
  assert.deepEqual(loadLevel(SOKOBAN_LEVELS[0]).goals, [{ row: 1, col: 3 }]);
});
test("player moves onto open floor", () => {
  const state = loadLevel(SOKOBAN_LEVELS[1]);
  assert.equal(movePlayer(state, "up").moved, true);
});
test("walls block movement", () => {
  const state = loadLevel(SOKOBAN_LEVELS[0]);
  const result = movePlayer(state, "up");
  assert.equal(result.blocked, true);
  assert.deepEqual(result.state.player, state.player);
});
test("box is detected in rendered cell", () => {
  assert.equal(cellAt(loadLevel(SOKOBAN_LEVELS[0]), { row: 1, col: 2 }), "box");
});
test("one box can be pushed into open space", () => {
  const result = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right");
  assert.equal(result.pushed, true);
  assert.deepEqual(result.state.boxes[0], { row: 1, col: 3 });
});
test("wall behind a box blocks pushing", () => {
  const completed = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right").state;
  assert.equal(movePlayer(completed, "right").blocked, true);
});
test("a second box blocks pushing", () => {
    const state = loadLevel({
      id: 99,
      difficulty: 1,
      optimalMoves: 1,
      map: ["#######", "#@$$..#", "#######"],
    });
  assert.equal(movePlayer(state, "right").blocked, true);
});
test("box on goal has the correct typed cell", () => {
  const state = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right").state;
  assert.equal(cellAt(state, { row: 1, col: 3 }), "boxOnGoal");
});
test("non-goal corners are deadlocks", () => {
  const state = loadLevel({
    id: 98,
    difficulty: 1,
    optimalMoves: 1,
    map: ["#####", "#@  #", "#$ .#", "#####"],
  });
  assert.equal(isDeadlocked(state, { row: 2, col: 1 }), true);
});
test("goals are not treated as deadlocks", () => {
  const state = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right").state;
  assert.equal(isDeadlocked(state, state.boxes[0]), false);
});
test("reset restores player, boxes and counters", () => {
  const level = SOKOBAN_LEVELS[1];
  const reset = resetLevel(level);
  assert.equal(reset.moves, 0);
  assert.deepEqual(reset, loadLevel(level));
});
test("all boxes on goals completes a puzzle", () => {
  assert.equal(
    movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right").state.completed,
    true,
  );
});
test("difficulty increases progressively", () => {
  assert.deepEqual(
    SOKOBAN_LEVELS.map((level) => level.difficulty),
    [1, 2, 3, 4, 5, 6],
  );
});
test("every level has equal boxes and goals and one player", () => {
  for (const level of SOKOBAN_LEVELS) {
    const state = loadLevel(level);
    assert.equal(state.boxes.length, state.goals.length);
    assert.ok(state.player);
  }
});
test("every predefined level is programmatically solvable", () => {
  for (const level of SOKOBAN_LEVELS)
    assert.equal(solvable(loadLevel(level)), true, `level ${level.id}`);
});
test("successful movement and pushes are counted", () => {
  const result = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "right").state;
  assert.equal(result.moves, 1);
  assert.equal(result.pushes, 1);
});
test("blocked movement is counted separately", () => {
  const result = movePlayer(loadLevel(SOKOBAN_LEVELS[0]), "up").state;
  assert.equal(result.moves, 0);
  assert.equal(result.blockedMoves, 1);
});
test("efficient solutions score above random movement", () => {
  const efficient = scoreSokoban([attempt()], "COMPLETED");
  const random = scoreSokoban(
    [attempt({ moves: 15, unnecessaryMoves: 8, resets: 2 })],
    "COMPLETED",
  );
  assert.ok(efficient.solutionEfficiency > random.solutionEfficiency);
  assert.ok(efficient.overallScore > random.overallScore);
});
test("analytics include every assessment counter and skill", () => {
  const result = scoreSokoban(
    [
      attempt(),
      attempt({ completed: false, unnecessaryPushes: 1, deadlocks: 1 }),
    ],
    "TIME_LIMIT_REACHED",
  );
  assert.equal(result.puzzlesAttempted, 2);
  assert.equal(result.puzzlesCompleted, 1);
  assert.equal(result.deadlocks, 1);
  assert.ok(result.planningScore > 0);
  assert.ok(result.spatialReasoningScore > 0);
  assert.ok(result.ruleFollowingScore > 0);
});
test("shared remaining time controls timeout", () => {
  assert.equal(timedOut(0), true);
  assert.equal(timedOut(1), false);
});
test("keyboard mapping supports arrows and WASD", () => {
  assert.equal(directionForKey("ArrowUp"), "up");
  assert.equal(directionForKey("a"), "left");
  assert.equal(directionForKey("D"), "right");
  assert.equal(directionForKey("x"), null);
});
