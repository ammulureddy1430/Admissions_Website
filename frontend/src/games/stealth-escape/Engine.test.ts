import { strict as assert } from "node:assert";
import test from "node:test";
import {
  atExit,
  canSee,
  createEvent,
  createGuards,
  createPlayer,
  difficultyFor,
  exitForRound,
  hitsWall,
  lineBlocked,
  movePlayer,
  stepDetection,
  stepEvent,
  stepGuard,
  wallsFor,
} from "./Engine";
import { scoreStealth } from "./Scoring";
test("player moves continuously", () => {
  const p = createPlayer(),
    w = wallsFor(1),
    x = p.x;
  movePlayer(p, { x: 1, y: 0 }, 0.1, w);
  assert.ok(p.x > x);
});
test("walls block player movement", () => {
  const p = createPlayer(),
    w = wallsFor(1);
  p.x = 160;
  p.y = 100;
  for (let i = 0; i < 20; i++) movePlayer(p, { x: 1, y: 0 }, 0.05, w);
  assert.ok(p.x < 180);
});
test("collision detects cover", () =>
  assert.equal(hitsWall(100, 220, 14, wallsFor(1)), true));
test("guards follow patrol routes", () => {
  const g = createGuards(1)[0],
    x = g.x;
  for (let i = 0; i < 20; i++) stepGuard(g, 0.05, 1);
  assert.notEqual(g.x, x);
});
test("guards turn toward patrol point", () => {
  const g = createGuards(2)[0],
    a = g.angle;
  g.routeIndex = 2;
  stepGuard(g, 0.1, 1);
  assert.notEqual(g.angle, a);
});
test("vision cone respects direction", () => {
  const g = createGuards(1)[0],
    p = createPlayer();
  g.x = 300;
  g.y = 300;
  g.angle = 0;
  p.x = 400;
  p.y = 300;
  assert.equal(canSee(g, p, []), true);
  p.x = 200;
  assert.equal(canSee(g, p, []), false);
});
test("line of sight is blocked by walls", () =>
  assert.equal(
    lineBlocked({ x: 100, y: 100 }, { x: 300, y: 100 }, [
      { x: 190, y: 50, w: 20, h: 100 },
    ]),
    true,
  ));
test("cover prevents detection", () => {
  const g = createGuards(1)[0],
    p = createPlayer();
  g.x = 100;
  g.y = 100;
  g.angle = 0;
  p.x = 300;
  p.y = 100;
  assert.equal(canSee(g, p, [{ x: 190, y: 50, w: 20, h: 100 }]), false);
});
test("detection rises gradually", () => {
  const g = createGuards(1)[0],
    p = createPlayer();
  g.x = 100;
  g.y = 100;
  g.angle = 0;
  p.x = 200;
  p.y = 100;
  stepDetection(g, p, [], 0.1);
  assert.ok(g.awareness > 0 && g.awareness < 100);
});
test("detection recovers out of sight", () => {
  const g = createGuards(1)[0],
    p = createPlayer();
  g.awareness = 50;
  g.x = 100;
  g.y = 100;
  g.angle = 0;
  p.x = 900;
  p.y = 500;
  stepDetection(g, p, [], 0.5);
  assert.ok(g.awareness < 50);
});
test("events are seeded", () =>
  assert.deepEqual(createEvent(4, 2), createEvent(4, 2)));
test("events expire", () => {
  const e = createEvent(1, 1);
  stepEvent(e, 3);
  assert.equal(e.active, false);
});
test("difficulty progresses by stage", () => {
  assert.equal(difficultyFor(0), 1);
  assert.equal(difficultyFor(170), 4);
});
test("exit requires physical arrival", () => {
  const p = createPlayer();
  assert.equal(atExit(p), false);
  p.x = 940;
  p.y = 60;
  assert.equal(atExit(p), true);
});
test("second round mirrors the extraction route", () => {
  const p = createPlayer();
  p.x = 58;
  p.y = 60;
  assert.equal(atExit(p, exitForRound(2)), true);
  assert.equal(atExit(p, exitForRound(1)), false);
});
test("inhibitory scoring rewards restraint", () => {
  const calm = scoreStealth({
      fullDetectionCount: 0,
      unnecessaryReactions: 0,
      ignoredIrrelevantEvents: 5,
      respondedRelevantEvents: 3,
      waitCount: 4,
      unnecessaryMovement: 0,
      recoveryCount: 1,
      nearDetectionCount: 1,
    }),
    impulsive = scoreStealth({
      fullDetectionCount: 4,
      unnecessaryReactions: 8,
      ignoredIrrelevantEvents: 0,
      respondedRelevantEvents: 0,
      waitCount: 0,
      unnecessaryMovement: 10,
      recoveryCount: 0,
      nearDetectionCount: 6,
    });
  assert.ok(Number(calm.overallScore) > Number(impulsive.overallScore));
});
