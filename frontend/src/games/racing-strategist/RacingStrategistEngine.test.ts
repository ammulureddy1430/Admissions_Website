import assert from "node:assert/strict";
import { VehicleEngine } from "./VehicleEngine";
import { TrackEngine } from "./TrackEngine";
import { OpponentEngine } from "./OpponentEngine";
import { scoreRacingStrategist } from "./ScoringEngine";
import { TRACKS } from "./Levels";

console.log("Starting Racing Strategist Engine tests...");

// 1. VehicleEngine Tests
const vehicle = new VehicleEngine(200, 150);
assert.equal(vehicle.state.x, 200);
assert.equal(vehicle.state.y, 150);
assert.equal(vehicle.state.speed, 0);

// Test Acceleration
vehicle.state.accelerating = true;
vehicle.update(false); // Update normal asphalt
assert.ok(vehicle.state.speed > 0, "Vehicle should speed up when accelerating");
assert.ok(vehicle.state.y > 150, "Vehicle should move forward vertically");

// Test Braking
const currentSpeed = vehicle.state.speed;
vehicle.state.accelerating = false;
vehicle.state.braking = true;
vehicle.update(false);
assert.ok(vehicle.state.speed < currentSpeed, "Vehicle should slow down when braking");

// Test Steering
vehicle.reset(200, 150);
vehicle.state.speed = 3.0;
vehicle.state.steering = 1; // Steer right
vehicle.update(false);
assert.ok(vehicle.state.heading > 0, "Heading angle should increase when steering right");
assert.ok(vehicle.state.x > 200, "X position should drift right when steering right");

// Test Wet Track Slipping (Drifting)
// Wet lateral traction (0.05) is much smaller than dry (0.35)
const dryVehicle = new VehicleEngine(200, 150);
dryVehicle.state.speed = 4.0;
dryVehicle.state.steering = 1;
dryVehicle.update(false); // Dry update

const wetVehicle = new VehicleEngine(200, 150);
wetVehicle.state.speed = 4.0;
wetVehicle.state.steering = 1;
wetVehicle.update(true); // Wet update

// Wet car should drift laterally less instantly than dry car (sluggish actual movement relative to target heading vx)
assert.ok(dryVehicle.state.vx > wetVehicle.state.vx, "Wet car should slide/drift laterally less responsive than dry car");


// 2. TrackEngine Tests
const trackEngine = new TrackEngine(TRACKS[1]); // Track 2 (Route Split)
assert.equal(trackEngine.currentTrack.id, 2);

// Check Normal segment
const boundsNormal = trackEngine.getRoadBoundsAt(200, 400);
assert.equal(boundsNormal.type, "normal");
assert.equal(boundsNormal.left, 200 - 90); // centerX - width/2
assert.equal(boundsNormal.right, 200 + 90);
assert.equal(boundsNormal.inDivider, false);

// Check Split segment
const boundsSplitLeft = trackEngine.getRoadBoundsAt(120, 1000);
assert.equal(boundsSplitLeft.type, "split");
assert.equal(boundsSplitLeft.roadCenter, 110); // leftForkCenterX
assert.equal(boundsSplitLeft.left, 110 - 40); // leftForkCenterX - forkWidth/2
assert.equal(boundsSplitLeft.right, 110 + 40);

const boundsSplitDivider = trackEngine.getRoadBoundsAt(200, 1000);
assert.equal(boundsSplitDivider.inDivider, true, "X=200 should be in the grass divider zone at y=1000");

// Check Route commitment helper
assert.equal(trackEngine.getChosenRoute(120, 1000), 1, "Should choose left fork");
assert.equal(trackEngine.getChosenRoute(280, 1000), 2, "Should choose right fork");


// 3. OpponentEngine Tests
const opponentData = TRACKS[0].opponents; // Track 1 Overtaking
const opponentEngine = new OpponentEngine(opponentData);
assert.equal(opponentEngine.opponents.length, 2);

const initialAIPosition = opponentEngine.opponents[0].y;
const t3Engine = new TrackEngine(TRACKS[0]);
opponentEngine.update(t3Engine);
assert.ok(opponentEngine.opponents[0].y > initialAIPosition, "AI opponent should drive forward");


// 4. Scoring & Metrics Tests
const rawMetrics = {
  sessionDuration: 120,
  tracksStarted: 4,
  tracksCompleted: 3,
  distanceTravelled: 8500,
  routeChoices: 3,
  safeRouteChoices: 2,
  riskyRouteChoices: 1,
  shortcutChoices: 2,
  shortcutSuccesses: 1,
  shortcutFailures: 1,
  overtakeAttempts: 3,
  successfulOvertakes: 2,
  unsuccessfulOvertakes: 1,
  overtakeWaitDecisions: 1,
  collisions: 2,
  nearCollisions: 1,
  obstacleAvoidanceAttempts: 4,
  successfulObstacleAvoidance: 3,
  brakingEvents: 10,
  appropriateBrakingEvents: 6,
  lateBrakingEvents: 2,
  unnecessaryBrakingEvents: 2,
  speedChanges: 20,
  routeChanges: 1,
  strategyChanges: 2,
  adaptiveDecisions: 1,
  successfulAdaptations: 1,
  failedAdaptations: 0,
  anticipatedEvents: 5,
  lateResponses: 2,
  decisionEvents: 5,
  averageDecisionTime: 1.8,
  decisionConsistency: 90,
  riskDecisions: 3,
  opponentInteractions: 3,
  trackConditionChanges: 1,
  responseToTrackChanges: 5,
  beginningPerformance: 85,
  middlePerformance: 80,
  endingPerformance: 75,
  highestDifficulty: 4,
  decisionTimes: [1.5, 2.1],
  routeChoiceTypes: ["split_wide_safe", "shortcut_fast"],
  riskOutcomes: ["risk_succeeded", "risk_failed"],
  completionStatus: "COMPLETED",
};

const scores = scoreRacingStrategist(rawMetrics);

// Check weights and clamping correctness
assert.ok(scores.overallScore >= 0 && scores.overallScore <= 100);
assert.ok(scores.strategicDecisionMakingScore >= 0 && scores.strategicDecisionMakingScore <= 100);
assert.ok(scores.riskAssessmentScore >= 0 && scores.riskAssessmentScore <= 100);
assert.ok(scores.anticipatoryReasoningScore >= 0 && scores.anticipatoryReasoningScore <= 100);
assert.ok(scores.adaptiveDecisionMakingScore >= 0 && scores.adaptiveDecisionMakingScore <= 100);

console.log("Racing Strategist engine tests passed successfully!");
