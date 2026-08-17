import test from "node:test";
import assert from "node:assert/strict";
import {
  applyJugAction,
  CHALLENGES,
  createJugs,
  difficultyForChallenge,
  isUnnecessaryAction,
  targetReached,
  timedOut,
} from "./WaterJugsEngine";
import { scoreWaterJugs } from "./ScoringEngine";
import type { ChallengeAttempt } from "./Types";

const attempt = (
  changes: Partial<ChallengeAttempt> = {},
): ChallengeAttempt => ({
  challengeId: 1,
  level: 1,
  targetReached: true,
  actions: 2,
  unnecessaryActions: 0,
  resets: 0,
  optimalActions: 2,
  completionTime: 5000,
  ...changes,
});
test("jug creation preserves capacities and starts empty", () => {
  assert.deepEqual(createJugs([2, 5]), [
    { capacity: 2, amount: 0 },
    { capacity: 5, amount: 0 },
  ]);
});
test("challenge capacities progress from two to three visual jugs", () => {
  assert.equal(CHALLENGES[0].capacities.length, 2);
  assert.equal(CHALLENGES.at(-1)?.capacities.length, 3);
});
test("fill action fills only the selected jug", () => {
  assert.deepEqual(
    applyJugAction(createJugs([2, 5]), { type: "fill", jug: 1 }).map(
      (j) => j.amount,
    ),
    [0, 5],
  );
});
test("empty action empties only the selected jug", () => {
  const full = applyJugAction(createJugs([2, 5]), { type: "fill", jug: 0 });
  assert.deepEqual(
    applyJugAction(full, { type: "empty", jug: 0 }).map((j) => j.amount),
    [0, 0],
  );
});
test("pour transfers liquid and prevents overflow", () => {
  let jugs = applyJugAction(createJugs([5, 2]), { type: "fill", jug: 0 });
  jugs = applyJugAction(jugs, { type: "pour", from: 0, to: 1 });
  assert.deepEqual(
    jugs.map((j) => j.amount),
    [3, 2],
  );
});
test("target detection uses the designated visual jug and level", () => {
  const challenge = CHALLENGES[0];
  const jugs = applyJugAction(createJugs(challenge.capacities), {
    type: "fill",
    jug: 0,
  });
  assert.equal(targetReached(jugs, challenge), false);
  assert.equal(
    targetReached(
      applyJugAction(jugs, { type: "pour", from: 0, to: 1 }),
      challenge,
    ),
    true,
  );
});
test("no-op actions are unnecessary", () => {
  const empty = createJugs([2, 5]);
  assert.equal(isUnnecessaryAction(empty, { type: "empty", jug: 0 }), true);
  assert.equal(
    isUnnecessaryAction(empty, { type: "pour", from: 0, to: 1 }),
    true,
  );
  assert.equal(isUnnecessaryAction(empty, { type: "fill", jug: 0 }), false);
});
test("reset restores all liquid levels", () => {
  const full = applyJugAction(createJugs([2, 5]), { type: "fill", jug: 1 });
  assert.deepEqual(
    applyJugAction(full, { type: "reset" }).map((j) => j.amount),
    [0, 0],
  );
});
test("difficulty progression is gradual and capped", () => {
  assert.equal(difficultyForChallenge(0), 1);
  assert.equal(difficultyForChallenge(3), 4);
  assert.equal(difficultyForChallenge(99), 4);
});
test("shared remaining time controls timeout", () => {
  assert.equal(timedOut(0), true);
  assert.equal(timedOut(1), false);
  assert.equal(timedOut(undefined), false);
});
test("analytics calculate success, failure, actions, efficiency and skills", () => {
  const result = scoreWaterJugs(
    [
      attempt(),
      attempt({
        challengeId: 2,
        level: 2,
        targetReached: false,
        actions: 5,
        unnecessaryActions: 2,
        resets: 1,
      }),
    ],
    "TIME_LIMIT_REACHED",
  );
  assert.equal(result.challengesAttempted, 2);
  assert.equal(result.challengesCompleted, 1);
  assert.equal(result.targetsMissed, 1);
  assert.equal(result.totalActions, 7);
  assert.equal(result.unnecessaryActions, 2);
  assert.equal(result.failedAttempts, 1);
  assert.equal(result.resetActions, 1);
  assert.ok(result.solutionEfficiency > 0);
  assert.ok(result.logicalReasoningScore > 0);
  assert.ok(result.overallScore > 0);
});
test("efficient solutions score above random action sequences", () => {
  const efficient = scoreWaterJugs([attempt()], "COMPLETED");
  const random = scoreWaterJugs(
    [attempt({ actions: 12, unnecessaryActions: 7, resets: 2 })],
    "COMPLETED",
  );
  assert.ok(efficient.overallScore > random.overallScore);
});
