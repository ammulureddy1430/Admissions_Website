import { strict as assert } from "node:assert";
import test from "node:test";
import {
  createCar,
  createAICars,
  difficultyFor,
  generateObstacles,
  getTrackPositionInfo,
  handleObstacleCollisions,
  stepAICars,
  stepCarPhysics,
  stepCones,
  TRACK_WAYPOINTS,
  type CarState,
  type Obstacle,
} from "./Engines";
import { scoreDriftRacer } from "./ScoringEngine";

test("difficulty level scales over time duration", () => {
  assert.equal(difficultyFor(0), 1);
  assert.equal(difficultyFor(45), 2);
  assert.equal(difficultyFor(150), 5);
});

test("car physics handles acceleration inputs and increases forward velocity", () => {
  const car = createCar(300, 300);
  assert.equal(car.speed, 0);

  // Apply throttle acceleration
  stepCarPhysics(car, 1.0, 0, 0, 0, 0.1, "ASPHALT");
  assert.ok(car.vx > 0);
  assert.ok(car.speed > 0);
});

test("car physics handles braking inputs and decelerates the car", () => {
  const car = createCar(300, 300);
  car.vx = 100;
  car.vy = 0;
  car.speed = 100;

  // Apply brake input
  stepCarPhysics(car, 0, 1.0, 0, 0, 0.1, "ASPHALT");
  assert.ok(car.vx < 100);
  assert.ok(car.speed < 100);
});

test("brake control reverses the car after it stops", () => {
  const car = createCar(300, 300);
  for (let step = 0; step < 8; step += 1) {
    stepCarPhysics(car, 0, 1, 0, 0, 0.1, "ASPHALT");
  }
  assert.ok(car.speed < 0);
  assert.ok(car.x < 300);
});

test("held steering produces a clear heading change", () => {
  const car = createCar(300, 300);
  car.vx = 90;
  for (let step = 0; step < 10; step += 1) {
    stepCarPhysics(car, 1, 0, 1, 0, 1 / 60, "ASPHALT");
  }
  assert.ok(car.angle > 0.08);
});

test("car physics handles steering inputs and gradually changes vehicle heading angle", () => {
  const car = createCar(300, 300);
  car.vx = 80;
  car.vy = 0;
  car.speed = 80;
  const initialAngle = car.angle;

  // Turn steer right
  stepCarPhysics(car, 1.0, 0, 1.0, 0, 0.1, "ASPHALT");
  assert.notEqual(car.angle, initialAngle);
  assert.ok(car.angularVelocity > 0);
});

test("handbrake triggers the sliding drift state", () => {
  const car = createCar(300, 300);
  car.vx = 100;
  car.vy = 0;
  car.speed = 100;

  // Apply handbrake
  stepCarPhysics(car, 1.0, 0, 1.0, 1.0, 0.1, "ASPHALT");
  assert.equal(car.driftState, "SLIDING");
  assert.ok(car.driftDuration > 0);
});

test("drift button alone does not throw the car into a slide", () => {
  const car = createCar(300, 300);
  car.vx = 120;
  stepCarPhysics(car, 1, 0, 0, 1, 0.1, "ASPHALT");
  assert.equal(car.driftState, "DRY_GRIP");
  assert.equal(car.angularVelocity, 0);
});

test("controlled drift sheds speed and caps rotation", () => {
  const car = createCar(300, 300);
  car.vx = 180;
  const initialSpeed = car.vx;
  for (let step = 0; step < 20; step += 1) {
    stepCarPhysics(car, 0, 0, 1, 1, 1 / 60, "ASPHALT");
  }
  assert.equal(car.driftState, "SLIDING");
  assert.ok(Math.abs(car.speed) < initialSpeed);
  assert.ok(Math.abs(car.angularVelocity) <= 1.75);
});

test("road surface type reduces grip coefficients dynamically", () => {
  const carNormal = createCar(300, 300);
  const carGravel = createCar(300, 300);

  stepCarPhysics(carNormal, 1.0, 0, 1.0, 0, 0.1, "ASPHALT");
  stepCarPhysics(carGravel, 1.0, 0, 1.0, 0, 0.1, "GRAVEL");

  assert.ok(carGravel.grip < carNormal.grip);
});

test("track positioning tracks off-track coordinates correctly", () => {
  // Center of track start segment is 300,300 (width 160).
  // Position (300, 300) is on track center line
  const infoOn = getTrackPositionInfo(300, 300);
  assert.equal(infoOn.onTrack, true);
  assert.equal(infoOn.surface, "ASPHALT");

  // Position (5000, 5000) is completely off-track
  const infoOff = getTrackPositionInfo(5000, 5000);
  assert.equal(infoOff.onTrack, false);
  assert.equal(infoOff.surface, "OFF_TRACK");
});

test("collisions with obstacles like oil triggers a spin state", () => {
  const car = createCar(300, 300);
  const obstaclesList: Obstacle[] = [
    {
      id: 99,
      x: 300,
      y: 300,
      type: "OIL",
      radius: 20,
      active: true,
    },
  ];

  let collided = false;
  handleObstacleCollisions(car, obstaclesList, (type) => {
    if (type === "OIL") collided = true;
  });

  assert.equal(collided, true);
  assert.ok(car.spinTimer > 0);

  // Step physics to update car.driftState from SPINNING
  stepCarPhysics(car, 0, 0, 0, 0, 0.1, "ASPHALT");
  assert.equal(car.driftState, "SPINNING");
});

test("collisions with cones pushes them with friction", () => {
  const car = createCar(300, 300);
  car.vx = 150;
  car.vy = 0;
  const obstaclesList: Obstacle[] = [
    {
      id: 100,
      x: 300,
      y: 300,
      type: "CONE",
      radius: 10,
      active: true,
      vx: 0,
      vy: 0,
    },
  ];

  handleObstacleCollisions(car, obstaclesList, () => {});
  assert.ok(obstaclesList[0].vx! > 0);

  // Cone moves and decelerates due to friction damping
  const initialVX = obstaclesList[0].vx!;
  stepCones(obstaclesList, 0.1);
  assert.ok(obstaclesList[0].x > 300);
  assert.ok(obstaclesList[0].vx! < initialVX);
});

test("AI opponents follow path waypoints chronologically", () => {
  const aiCars = createAICars();
  const initialX = aiCars[0].x;
  const initialWaypoint = aiCars[0].targetWaypointIndex;

  // Step AI simulation
  stepAICars(aiCars, 0.1);
  assert.notEqual(aiCars[0].x, initialX);
  
  // Set artificial target proximity
  aiCars[0].x = TRACK_WAYPOINTS[initialWaypoint].x;
  aiCars[0].y = TRACK_WAYPOINTS[initialWaypoint].y;
  stepAICars(aiCars, 0.1);
  // Verify waypoint index advanced
  assert.equal(aiCars[0].targetWaypointIndex, initialWaypoint + 1);
});

test("scoring logic computes primary motor adaptation metrics and weights", () => {
  const goodPerformance = scoreDriftRacer({
    sessionDuration: 180,
    distanceTravelled: 8000,
    lapsCompleted: 3,
    averageSpeed: 150,
    maximumSpeed: 300,
    brakingEvents: 20,
    accelerationEvents: 100,
    trackBoundaryHits: 1,      // low crashes
    obstacleCollisions: 0,
    spinCount: 0,
    recoveryCount: 1,
    driftCount: 5,
    driftDuration: 30,
    successfulCornerDrifts: 5, // high success
    driftOvercorrectionCount: 1,
    steeringChanges: 120,
    steeringCorrections: 10,
    surfaceChanges: 4,
    adaptationTime: 3,
    surfaceRecoveryTime: 2,
    offTrackDuration: 5,
  });

  const badPerformance = scoreDriftRacer({
    sessionDuration: 180,
    distanceTravelled: 3000,
    lapsCompleted: 0,
    averageSpeed: 50,
    maximumSpeed: 120,
    brakingEvents: 50,
    accelerationEvents: 50,
    trackBoundaryHits: 15,     // high crashes
    obstacleCollisions: 5,
    spinCount: 4,              // multiple spinouts
    recoveryCount: 0,
    driftCount: 8,
    driftDuration: 10,
    successfulCornerDrifts: 1, // poor control
    driftOvercorrectionCount: 12,
    steeringChanges: 500,      // erratic steering
    steeringCorrections: 90,
    surfaceChanges: 4,
    adaptationTime: 25,
    surfaceRecoveryTime: 40,
    offTrackDuration: 80,
  });

  assert.ok(Number(goodPerformance.overallScore) > Number(badPerformance.overallScore));
  assert.ok(Number(goodPerformance.motorControlAdaptationScore) > 75);
  assert.ok(Number(badPerformance.motorControlAdaptationScore) < 50);
});
