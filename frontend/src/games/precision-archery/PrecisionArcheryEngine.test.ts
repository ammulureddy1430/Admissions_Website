import {
  aimAngle,
  drawFromDistance,
  launchArrow,
  launchArrowAt,
  pointerToWorld,
  stepArrow,
} from "./ArrowEngine";
import {
  collision,
  createTargets,
  isArcheryComplete,
  roundForCompletedShots,
  targetPosition,
} from "./TargetEngine";
import { scoreArchery } from "./ScoringEngine";

const world = pointerToWorld(450, 280, {
  left: 0,
  top: 0,
  width: 900,
  height: 560,
});
console.assert(
  world.x === 450 && world.y === 280,
  "Pointer coordinates should map to canvas coordinates",
);
console.assert(
  Math.abs(aimAngle({ x: 0, y: 0 }, { x: 1, y: 0 })) < 0.001,
  "Horizontal aim should be zero radians",
);
console.assert(
  drawFromDistance(999) === 1 && drawFromDistance(0) === 0,
  "Draw must be bounded",
);
const arrow = launchArrow(-0.2, 0.8);
const oldX = arrow.x;
const oldVy = arrow.vy;
stepArrow(arrow, 0.1, 30);
console.assert(arrow.x > oldX, "Released arrow must travel");
console.assert(arrow.vy > oldVy, "Gravity must curve the arrow");
console.assert(
  arrow.vx > Math.cos(-0.2) * (360 + 0.8 * 430),
  "Wind must affect velocity",
);
const pointerShot = launchArrowAt({ x: 665, y: 248 }, 0.8, 12);
while (pointerShot.x < 665) stepArrow(pointerShot, 1 / 120, 12);
console.assert(
  pointerShot.x === 665 && pointerShot.y === 248,
  "The arrow must arrive at the exact pointer position",
);
const targets = createTargets(7, 4);
console.assert(
  targets.length === 3,
  "Later play should introduce multiple targets",
);
const p1 = targetPosition(targets[0], 1);
const p2 = targetPosition(targets[0], 1);
console.assert(
  p1.x === p2.x && p1.y === p2.y,
  "Target motion must be deterministic",
);
const openingTarget = createTargets(1, 3)[0];
const openingA = targetPosition(openingTarget, 0);
const openingB = targetPosition(openingTarget, 1);
console.assert(
  openingA.x === openingB.x && openingA.y === openingB.y,
  "The target must remain stationary while aiming",
);
const alignedArrow = launchArrow(
  aimAngle(
    { x: 158, y: 285 },
    { x: openingTarget.baseX, y: openingTarget.baseY },
  ),
  1,
);
while (alignedArrow.x < openingTarget.baseX)
  stepArrow(alignedArrow, 1 / 120, 0);
openingTarget.x = openingTarget.baseX;
openingTarget.y = openingTarget.baseY;
console.assert(
  collision(alignedArrow.x, alignedArrow.y, openingTarget).ring === "center",
  "A full-draw arrow aimed at the yellow midpoint must register a center hit",
);
console.assert(
  createTargets(1, 3).length === 1 && createTargets(2, 3).length === 1,
  "Both rounds use one clear target",
);
console.assert(
  createTargets(1, 3)[0].radius > createTargets(2, 3)[0].radius &&
    createTargets(1, 3)[0].baseX < createTargets(2, 3)[0].baseX,
  "Round 2 must use a visibly smaller and farther target",
);
console.assert(
  roundForCompletedShots(3) === 1 && roundForCompletedShots(4) === 2,
  "Round 1 must transition after exactly four completed shots",
);
console.assert(
  !isArcheryComplete(7) && isArcheryComplete(8),
  "Round 2 must finish after four additional shots",
);
console.assert(
  8 + Math.sin(1 * 0.7) * 2 > 0 && -16 + Math.sin(1 * 0.55) * 3 < 0,
  "Both rounds must have deterministic wind in distinct directions",
);
const hit = collision(targets[0].x, targets[0].y, targets[0]);
console.assert(
  hit.hit && hit.ring === "center",
  "Center collision must be detected",
);
console.assert(
  collision(targets[0].x - targets[0].radius, targets[0].y, targets[0]).ring ===
    "edge",
  "A pointer on the outer left layer must register an edge hit",
);
console.assert(
  collision(targets[0].x + targets[0].radius, targets[0].y, targets[0]).ring ===
    "edge",
  "A pointer on the outer right layer must register an edge hit",
);
const metrics = scoreArchery(
  [
    {
      aimError: 8,
      aimVariance: 2,
      drawAmount: 0.7,
      force: 620,
      releaseTiming: 4,
      hitDistance: 8,
      ring: "center",
      correctionTime: 2,
    },
  ],
  3,
  60,
);
console.assert(
  Number(metrics.visualMotorPrecisionScore) > 0 &&
    Number(metrics.overallScore) <= 100,
  "Scoring must be bounded and use control data",
);
