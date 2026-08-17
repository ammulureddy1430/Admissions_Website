import assert from "node:assert/strict";
import { GateEngine } from "./GateEngine";
import { levelAt } from "./Levels";
import { PlaneEngine } from "./PlaneEngine";
import { PriorityEngine } from "./PriorityEngine";
import { RouteEngine } from "./RouteEngine";
import { scoreAirport } from "./ScoringEngine";
import { TrafficEngine } from "./TrafficEngine";

const priority = new PriorityEngine(() => 0);
const planes = new PlaneEngine(priority, () => 0);
planes.reset(0);
planes.update(0.016, 0, levelAt(0), 1000, 700);
assert.equal(planes.planes.length, 1);
assert.equal(planes.planes[0].destination, "blue");
assert.equal(planes.planes[0].priority, false);
const x = planes.planes[0].x;
planes.update(1, 1000, levelAt(0), 1000, 700);
assert.ok(planes.planes[0].x > x);

const gates = new GateEngine();
gates.reset(1000, 700, 3, 0);
assert.equal(gates.gates.length, 3);
const gate = gates.gates[0];
assert.equal(gates.available(gate), true);
gates.assign(gate, "plane-1", 0);
assert.equal(gates.available(gate), false);
gates.update(4000, 0);
assert.equal(gates.available(gate), true);

const closing = new GateEngine();
closing.reset(1000, 700, 4, 0);
closing.nextClosure = 1;
closing.update(2, 1, () => 0);
assert.equal(closing.closures, 1);
assert.ok(closing.gates.some((item) => item.temporarilyClosed));

const routeEngine = new RouteEngine();
const route = routeEngine.route(planes.planes[0], gates.gates[0]);
assert.equal(route.length, 3);
assert.ok(routeEngine.efficiency(planes.planes[0], gates.gates[0]) > 0);

const traffic = new TrafficEngine();
const first = planes.planes[0];
const second = { ...first, id: "plane-2" };
traffic.select(first);
traffic.select(second);
assert.equal(traffic.switches, 1);

assert.equal(levelAt(0).stage, 1);
assert.equal(levelAt(-100).stage, 1);
assert.equal(levelAt(Number.NaN).stage, 1);
assert.equal(levelAt(119000).stage, 7);

const metrics = scoreAirport(
  [
    {
      kind: "route",
      at: 1000,
      planeId: "one",
      correct: true,
      decisionTime: 900,
      priority: true,
      efficiency: 85,
    },
    {
      kind: "complete",
      at: 5000,
      planeId: "one",
      correct: true,
      decisionTime: 0,
      priority: true,
      efficiency: 100,
    },
  ],
  {
    sessionDuration: 120,
    planesSpawned: 1,
    gatesUsed: 1,
    gateConflicts: 0,
    routeConflicts: 0,
    priorityPlanes: 1,
    gateClosures: 0,
    gateClosureAdaptations: 0,
    taskSwitches: 0,
    taskSwitchLatency: 0,
    abandonedTasks: 0,
    recoveredTasks: 0,
    unnecessaryRouteChanges: 0,
    highestDifficulty: 7,
    completionStatus: "COMPLETED",
  },
);
assert.equal(metrics.planesCompleted, 1);
assert.equal(metrics.priorityPlanesHandled, 1);
assert.ok(metrics.overallScore > 0 && metrics.overallScore <= 100);
console.log("Airport Controller engine tests passed");
