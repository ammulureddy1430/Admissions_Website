"use client";
import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DifficultyEngine } from "./DifficultyEngine";
import { GateEngine } from "./GateEngine";
import { PlaneEngine } from "./PlaneEngine";
import { RouteEngine } from "./RouteEngine";
import { scoreAirport } from "./ScoringEngine";
import { TrafficEngine } from "./TrafficEngine";
import type {
  AirportMetrics,
  DestinationColor,
  Gate,
  Plane,
  RouteEvent,
} from "./Types";
import "./AirportControllerGame.css";
type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (m: AirportMetrics) => void | Promise<void>;
};
const COLORS: Record<DestinationColor, string> = {
  blue: "#3c82f6",
  green: "#2fbf76",
  red: "#ef5365",
};
const formatTime = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(
    Math.max(0, seconds) % 60,
  ).padStart(2, "0")}`;
export default function AirportControllerGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    raf = useRef(0),
    complete = useRef(onComplete),
    done = useRef(false),
    ending = useRef(false),
    finishAt = useRef(0),
    start = useRef(0),
    last = useRef(0),
    planes = useRef(new PlaneEngine()),
    gates = useRef(new GateEngine()),
    routes = useRef(new RouteEngine()),
    traffic = useRef(new TrafficEngine()),
    difficulty = useRef(new DifficultyEngine()),
    events = useRef<RouteEvent[]>([]),
    selected = useRef<string | null>(null),
    completed = useRef(new Set<string>()),
    gateConflicts = useRef(0),
    closureAdaptations = useRef(0),
    unnecessaryChanges = useRef(0),
    highest = useRef(1),
    lastSwitchLatency = useRef(0);
  const [started, setStarted] = useState(false),
    [preview, setPreview] = useState(remainingSeconds ?? 120),
    [selectedView, setSelectedView] = useState<DestinationColor | null>(null);
  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);
  const finish = useCallback((completionStatus = "COMPLETED") => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(raf.current);
    const elapsed = Math.max(1, performance.now() - start.current);
    void complete.current(
      scoreAirport(events.current, {
        sessionDuration: Math.round(elapsed / 1000),
        planesSpawned: planes.current.spawned,
        gatesUsed: events.current.filter((e) => e.kind === "complete").length,
        gateConflicts: gateConflicts.current,
        routeConflicts: routes.current.conflicts,
        priorityPlanes: planes.current.priority.generated,
        gateClosures: gates.current.closures,
        gateClosureAdaptations: closureAdaptations.current,
        taskSwitches: traffic.current.switches,
        taskSwitchLatency: lastSwitchLatency.current,
        abandonedTasks: traffic.current.abandoned,
        recoveredTasks: traffic.current.recovered,
        unnecessaryRouteChanges: unnecessaryChanges.current,
        highestDifficulty: highest.current,
        completionStatus,
      }),
    );
  }, []);
  useEffect(() => {
    if (
      started &&
      !practiceOnly &&
      remainingSeconds !== undefined &&
      remainingSeconds <= 0 &&
      !ending.current
    ) {
      ending.current = true;
      finishAt.current = performance.now() + 900;
    }
  }, [started, practiceOnly, remainingSeconds]);
  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const id = setInterval(() => setPreview((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [started, practiceOnly, disabled]);
  useEffect(() => {
    if (started && practiceOnly && preview <= 0 && !ending.current) {
      ending.current = true;
      finishAt.current = performance.now() + 900;
    }
  }, [started, practiceOnly, preview]);
  useEffect(() => {
    if (!started || disabled || done.current) return;
    const el = canvas.current,
      ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    start.current = performance.now();
    last.current = start.current;
    planes.current.reset(start.current);
    const resize = () => {
      const b = el.getBoundingClientRect(),
        s = Math.min(devicePixelRatio || 1, 2);
      el.width = b.width * s;
      el.height = b.height * s;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      gates.current.reset(b.width, b.height, 2, performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const pointer = (ev: PointerEvent) => {
      if (ending.current) return;
      ev.preventDefault();
      const b = el.getBoundingClientRect(),
        x = ev.clientX - b.left,
        y = ev.clientY - b.top,
        now = performance.now();
      const plane = planes.current.planes.find(
        (p) => p.state !== "departing" && Math.hypot(p.x - x, p.y - y) < 76,
      );
      if (plane) {
        if (selected.current && selected.current !== plane.id) {
          traffic.current.abandon();
          lastSwitchLatency.current =
            now -
            (planes.current.planes.find((p) => p.id === selected.current)
              ?.decisionAt || now);
        }
        traffic.current.select(plane);
        selected.current = plane.id;
        setSelectedView(plane.destination);
        plane.decisionAt = now;
        return;
      }
      const gate = gates.current.gates.find(
        (g) => Math.hypot(g.x - x, g.y - y) < 66,
      );
      if (!gate || !selected.current) return;
      const chosen = planes.current.planes.find(
        (p) => p.id === selected.current,
      );
      if (!chosen || chosen.state === "departing" || chosen.state === "parked")
        return;
      const wasHolding = chosen.state === "holding",
        available = gates.current.available(gate),
        valid = available && gates.current.valid(gate, chosen.destination),
        elapsed = now - start.current,
        decision = now - (chosen.decisionAt || chosen.spawnedAt),
        efficiency = routes.current.efficiency(chosen, gate);
      if (!available) {
        gateConflicts.current++;
        events.current.push({
          kind: "conflict",
          at: elapsed,
          planeId: chosen.id,
          correct: false,
          decisionTime: decision,
          priority: chosen.priority,
          efficiency,
        });
        chosen.state = "holding";
        selected.current = null;
        setSelectedView(null);
        return;
      }
      const route = routes.current.route(chosen, gate);
      if (
        routes.current.hasConflict(
          route,
          planes.current.planes.filter((p) => p.id !== chosen.id),
        )
      )
        events.current.push({
          kind: "conflict",
          at: elapsed,
          planeId: chosen.id,
          correct: valid,
          decisionTime: decision,
          priority: chosen.priority,
          efficiency,
        });
      if (wasHolding) {
        events.current.push({
          kind: "redirect",
          at: elapsed,
          planeId: chosen.id,
          correct: valid,
          decisionTime: decision,
          priority: chosen.priority,
          efficiency,
        });
        unnecessaryChanges.current++;
      }
      events.current.push({
        kind: valid ? "route" : "misroute",
        at: elapsed,
        planeId: chosen.id,
        correct: valid,
        decisionTime: decision,
        priority: chosen.priority,
        efficiency,
      });
      chosen.route = route;
      chosen.routeIndex = 0;
      chosen.assignedGate = gate.id;
      chosen.validRoute = valid;
      chosen.state = "taxiing";
      if (valid) {
        gate.occupiedBy = chosen.id;
        gate.releaseAt = Infinity;
        if (gate.color !== chosen.destination) {
          closureAdaptations.current++;
          gates.current.closureAdaptations++;
        }
      }
      selected.current = null;
      setSelectedView(null);
    };
    el.addEventListener("pointerdown", pointer);
    const loop = (now: number) => {
      const b = el.getBoundingClientRect(),
        dt = Math.min(0.035, (now - last.current) / 1000),
        elapsed = now - start.current;
      last.current = now;
      const level = difficulty.current.get(elapsed);
      highest.current = Math.max(highest.current, level.stage);
      if (!ending.current) {
        gates.current.configure(b.width, b.height, level.gateCount);
        for (const p of planes.current.planes) {
          if (p.state === "parked" && !completed.current.has(p.id)) {
            completed.current.add(p.id);
            const gate = p.assignedGate && gates.current.byId(p.assignedGate);
            if (gate) gate.releaseAt = now + 3000;
            events.current.push({
              kind: "complete",
              at: elapsed,
              planeId: p.id,
              correct: true,
              decisionTime: 0,
              priority: p.priority,
              efficiency: 100,
            });
          }
          if (p.state === "parked") {
            const gate = p.assignedGate && gates.current.byId(p.assignedGate);
            if (
              gate &&
              Number.isFinite(gate.releaseAt) &&
              now >= gate.releaseAt
            ) {
              gate.occupiedBy = undefined;
              gate.releaseAt = 0;
              planes.current.depart(p);
            }
          }
        }
        planes.current.update(dt, now, level, b.width, b.height);
        gates.current.update(now, level.closureChance);
      }
      drawAirport(ctx, b.width, b.height);
      drawRoutes(ctx, planes.current.planes);
      drawGates(ctx, gates.current.gates);
      drawPlanes(ctx, planes.current.planes, selected.current, now);
      if (ending.current && now >= finishAt.current) {
        finish();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", pointer);
      cancelAnimationFrame(raf.current);
    };
  }, [disabled, finish, started]);
  return (
    <div className="airport-controller">
      {practiceOnly && (
        <div className="ac-timer" aria-label="Time remaining">
          ⏱ {formatTime(preview)}
        </div>
      )}
      {started && (
        <div
          className={`ac-controls ${selectedView ? "selected" : ""}`}
          aria-label="Current game step"
        >
          {!selectedView ? (
            <span>
              <b>1</b>
              <strong>Tap a plane</strong>
              <em>✈️</em>
            </span>
          ) : (
            <span>
              <b>2</b>
              <strong>Tap the same-color gate</strong>
              <em
                className="ac-color-sample"
                style={{ background: COLORS[selectedView] }}
              />
            </span>
          )}
        </div>
      )}
      <canvas
        ref={canvas}
        aria-label="Airport Controller. Tap a moving plane, then tap the gate you choose."
      />
      {!started && (
        <div className="ac-intro">
          <div>
            <div className="ac-demo">
              <span>
                ✈️
                <i />
              </span>
              <b>1</b>
              <em>→</em>
              <span className="ac-gate">●</span>
              <b>2</b>
            </div>
            <div className="ac-how">
              <span>
                <b>1</b> Tap plane
              </span>
              <i>→</i>
              <span>
                <b>2</b> Match color
              </span>
              <i>→</i>
              <span>
                <b>3</b> Plane parks
              </span>
            </div>
            <p>Keep routing planes while the airport stays active</p>
            <button
              onClick={() => setStarted(true)}
              aria-label="Start Airport Controller"
            >
              <Play fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function drawAirport(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = "#bfe8f4";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffffff99";
  for (const [x, y, size] of [
    [w * 0.13, h * 0.14, 42],
    [w * 0.82, h * 0.17, 55],
  ]) {
    c.beginPath();
    c.arc(x, y, size, 0, Math.PI * 2);
    c.arc(x + size * 0.8, y + 5, size * 0.7, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#8bc98b";
  c.fillRect(0, h * 0.55, w, h * 0.45);
  c.fillStyle = "#5d6875";
  c.fillRect(w * 0.08, h * 0.34, w * 0.84, h * 0.13);
  c.strokeStyle = "#fff";
  c.lineWidth = 5;
  c.setLineDash([22, 18]);
  c.beginPath();
  c.moveTo(w * 0.1, h * 0.405);
  c.lineTo(w * 0.9, h * 0.405);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#e9eef1";
  c.fillRect(w * 0.07, h * 0.68, w * 0.86, h * 0.24);
  c.strokeStyle = "#9aadb5";
  c.lineWidth = 3;
  for (let index = 1; index < 4; index++) {
    c.beginPath();
    c.moveTo(w * 0.07, h * (0.68 + index * 0.06));
    c.lineTo(w * 0.93, h * (0.68 + index * 0.06));
    c.stroke();
  }
  c.fillStyle = "#2a5368";
  c.fillRect(w * 0.43, h * 0.56, w * 0.14, h * 0.1);
  c.fillStyle = "#d7f4fa";
  c.fillRect(w * 0.455, h * 0.53, w * 0.09, h * 0.04);
  c.fillStyle = "#23465b";
  c.font = "800 18px system-ui";
  c.textAlign = "center";
  c.fillText("AIRPORT", w / 2, 32);
}
function drawRoutes(c: CanvasRenderingContext2D, ps: Plane[]) {
  c.strokeStyle = "#657b83aa";
  c.lineWidth = 5;
  c.setLineDash([10, 10]);
  for (const p of ps.filter((x) => x.state === "taxiing")) {
    c.beginPath();
    c.moveTo(p.x, p.y);
    for (const q of p.route.slice(p.routeIndex)) c.lineTo(q.x, q.y);
    c.stroke();
  }
  c.setLineDash([]);
}
function drawGates(c: CanvasRenderingContext2D, gs: Gate[]) {
  for (const g of gs) {
    c.fillStyle = g.temporarilyClosed
      ? "#5e6873"
      : g.occupiedBy
        ? "#aab3b8"
        : "#fff";
    c.strokeStyle = COLORS[g.color];
    c.lineWidth = 8;
    c.beginPath();
    c.roundRect(g.x - 55, g.y - 42, 110, 84, 22);
    c.fill();
    c.stroke();
    c.fillStyle = COLORS[g.color];
    c.beginPath();
    c.arc(g.x, g.y, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#17384b";
    c.font = "800 13px system-ui";
    c.textAlign = "center";
    c.fillText(g.id.slice(-1), g.x, g.y + 34);
    if (g.temporarilyClosed) {
      c.strokeStyle = "#fff";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(g.x - 27, g.y - 25);
      c.lineTo(g.x + 27, g.y + 25);
      c.moveTo(g.x + 27, g.y - 25);
      c.lineTo(g.x - 27, g.y + 25);
      c.stroke();
    }
  }
}
function drawPlanes(
  c: CanvasRenderingContext2D,
  ps: Plane[],
  selected: string | null,
  now: number,
) {
  for (const p of ps) {
    c.save();
    c.translate(p.x, p.y);
    if (p.id === selected) {
      c.strokeStyle = "#ffd34f";
      c.lineWidth = 9;
      c.beginPath();
      c.arc(0, 0, 68, 0, Math.PI * 2);
      c.stroke();
    }
    drawPlaneShape(c, p.angle);
    if (p.priority) {
      c.font = "31px system-ui";
      c.fillText("⭐", 52, -43);
    }
    if (now < p.indicatorUntil || p.id === selected) {
      c.fillStyle = "#fff";
      c.beginPath();
      c.roundRect(-72, -68, 48, 44, 14);
      c.fill();
      c.strokeStyle = COLORS[p.destination];
      c.lineWidth = 5;
      c.stroke();
      c.fillStyle = COLORS[p.destination];
      c.beginPath();
      c.arc(-48, -46, 14, 0, Math.PI * 2);
      c.fill();
      if (p.symbol === "star") {
        c.fillStyle = "#fff";
        c.font = "15px system-ui";
        c.fillText("★", -48, -41);
      }
    }
    c.restore();
  }
}

function drawPlaneShape(c: CanvasRenderingContext2D, angle: number) {
  c.save();
  c.rotate(angle);
  c.shadowColor = "#173e5570";
  c.shadowBlur = 12;
  c.fillStyle = "#f7fcff";
  c.strokeStyle = "#24566f";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(62, 0);
  c.quadraticCurveTo(45, -14, 14, -13);
  c.lineTo(-42, -10);
  c.quadraticCurveTo(-58, -7, -62, 0);
  c.quadraticCurveTo(-58, 7, -42, 10);
  c.lineTo(14, 13);
  c.quadraticCurveTo(45, 14, 62, 0);
  c.closePath();
  c.fill();
  c.stroke();
  c.shadowBlur = 0;
  c.fillStyle = "#3f9fd0";
  c.strokeStyle = "#24566f";
  c.beginPath();
  c.moveTo(13, -10);
  c.lineTo(-13, -52);
  c.lineTo(-29, -48);
  c.lineTo(-14, -8);
  c.lineTo(-14, 8);
  c.lineTo(-29, 48);
  c.lineTo(-13, 52);
  c.lineTo(13, 10);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#2d7da8";
  c.beginPath();
  c.moveTo(-40, -8);
  c.lineTo(-53, -28);
  c.lineTo(-60, -25);
  c.lineTo(-55, 0);
  c.lineTo(-60, 25);
  c.lineTo(-53, 28);
  c.lineTo(-40, 8);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#bdefff";
  c.beginPath();
  c.ellipse(39, 0, 9, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
