import assert from "node:assert/strict";
import { PlayerEngine } from "./PlayerEngine";
import { BallEngine } from "./BallEngine";
import { TeamEngine } from "./TeamEngine";
import { DefenderEngine } from "./DefenderEngine";
import { scorePlaymaker } from "./ScoringEngine";

console.log("Starting Playmaker Engine tests...");

// 1. PlayerEngine Tests
const player = new PlayerEngine(400, 450);
assert.equal(player.state.x, 400);
assert.equal(player.state.y, 450);

// Test Movement
player.update({ w: true }); // Move up
assert.ok(player.state.y < 450, "Player should move up");

// Test Boundaries
player.reset(50, 450);
player.update({ a: true }); // Move left
assert.equal(player.state.x, 50 + player.state.radius, "Player should stay inside left boundary");


// 2. BallEngine Tests
const ball = new BallEngine(400, 450);
assert.equal(ball.state.carrierId, "player");

// Start a pass towards (500, 300)
ball.startPass(400, 450, 500, 300, 10);
assert.equal(ball.state.carrierId, null);
assert.ok(ball.state.isTraveling, "Ball should be traveling during pass");

// Test updates
const dummyPlayer = { x: 400, y: 450, vx: 0, vy: 0, radius: 16, speed: 4 };
const dummyTeammates = [
  { id: "teammate_0", name: "Teammate A", x: 500, y: 300, vx: 0, vy: 0, radius: 16, speed: 3, routeType: "wing_cut_left", routeIndex: 0, targetX: 500, targetY: 300, isHoldingBall: false, stateTimer: 0 }
];
const dummyDefenders = [
  { id: "defender_0", x: 600, y: 600, vx: 0, vy: 0, radius: 16, speed: 2, targetX: 600, targetY: 600, guardingId: "player", cheatFactorX: 0, cheatFactorY: 0 }
];

let caught = false;
let intercepted = false;

// Update until caught or reached destination
for (let i = 0; i < 30; i++) {
  ball.update(
    dummyPlayer,
    dummyTeammates,
    dummyDefenders,
    () => { intercepted = true; },
    () => { caught = true; },
    () => {},
    () => {}
  );
  if (caught || intercepted) break;
}

assert.ok(caught, "Ball should be caught by target teammate");
assert.equal(ball.state.carrierId, "teammate_0");


// 3. TeamEngine Tests
const team = new TeamEngine();
team.reset(["wing_cut_left", "wing_cut_right"]);
assert.equal(team.states.length, 2);
assert.equal(team.states[0].routeType, "wing_cut_left");

// Verify movement along route
const initialX = team.states[0].x;
team.update(null, 400, 450, () => {});
assert.ok(team.states[0].x !== initialX, "Teammate should move along route target");


// 4. DefenderEngine Tests
const defenders = new DefenderEngine();
defenders.reset(1, ["teammate_0"], 1.0);
assert.equal(defenders.states.length, 1);
assert.equal(defenders.states[0].guardingId, "teammate_0");

// Verify guarding behavior: stands between ball carrier (400, 450) and teammate (500, 300)
const initialDefX = defenders.states[0].x;
defenders.update(400, 450, dummyPlayer, dummyTeammates, false, 0, 0, {});
assert.ok(defenders.states[0].x !== initialDefX, "Defender should shift to guard teammate");


// 5. Scoring & Metrics Tests
const rawMetrics = {
  sessionDuration: 120,
  playsStarted: 6,
  playsCompleted: 5,
  passesAttempted: 10,
  passesCompleted: 8,
  passesIntercepted: 1,
  passesOutOfBounds: 1,
  passTargetSelections: 10,
  appropriateTargetSelections: 9,
  poorTargetSelections: 1,
  leadPassAttempts: 4,
  leadPassSuccesses: 3,
  receiverMovementTracked: 4,
  receiverPredictionAccuracy: 85,
  defenderPredictionAccuracy: 90,
  passingLaneRecognitions: 8,
  passingLaneErrors: 2,
  earlyPasses: 1,
  latePasses: 1,
  wellTimedPasses: 8,
  decisionEvents: 10,
  decisionTimes: [0.8, 1.2, 0.9, 0.7, 1.1, 0.8, 0.9, 1.0, 0.6, 0.7],
  averageDecisionTime: 0.87,
  riskPasses: 2,
  safePasses: 8,
  riskOutcomes: [1, 0],
  strategyChanges: 2,
  successfulStrategyChanges: 2,
  failedStrategyChanges: 0,
  repeatedStrategyCount: 1,
  repeatedFailedStrategyCount: 0,
  adaptiveResponses: 2,
  defensiveAdaptationsDetected: 2,
  defensiveAdaptationsMissed: 0,
  situationalAwarenessEvents: 5,
  selectiveAttentionEvents: 5,
  distractorResponses: 0,
  beginningPerformance: 80,
  middlePerformance: 85,
  endingPerformance: 90,
  highestDifficulty: 5,
};

const scores = scorePlaymaker(rawMetrics);

assert.ok(scores.overallScore! >= 0 && scores.overallScore! <= 100);
assert.ok(scores.anticipationScore! >= 0 && scores.anticipationScore! <= 100);
assert.ok(scores.decisionMakingScore! >= 0 && scores.decisionMakingScore! <= 100);
assert.ok(scores.spatialPredictionScore! >= 0 && scores.spatialPredictionScore! <= 100);
assert.ok(scores.situationalAwarenessScore! >= 0 && scores.situationalAwarenessScore! <= 100);
assert.ok(scores.timingScore! >= 0 && scores.timingScore! <= 100);

console.log("Playmaker engine tests passed successfully!");
