"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  atExit,
  canSee,
  createEvent,
  createGuards,
  createPlayer,
  difficultyFor,
  exitForRound,
  lineBlocked,
  movePlayer,
  stepDetection,
  stepEvent,
  stepGuard,
  wallsFor,
  type Event,
  type Guard,
  type Player,
  type Rect,
  type Vec,
} from "./Engine";
import { scoreStealth, type StealthMetrics } from "./Scoring";
import "./stealth-escape.css";
type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  attemptSeed?: number;
  onComplete?: (m: StealthMetrics) => void;
};
const W = 1000,
  H = 600;
export default function StealthEscapeGame({
  disabled = false,
  remainingSeconds = 180,
  practiceOnly = false,
  attemptSeed = 0,
  onComplete,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    raf = useRef(0),
    startedAt = useRef(0),
    last = useRef(0),
    done = useRef(false),
    ending = useRef(false),
    player = useRef(createPlayer()),
    walls = useRef(wallsFor(attemptSeed)),
    guards = useRef(createGuards(attemptSeed)),
    events = useRef<Event[]>([]),
    keys = useRef(new Set<string>()),
    stick = useRef<Vec>({ x: 0, y: 0 }),
    nextEvent = useRef(5),
    round = useRef(1),
    roundFlashUntil = useRef(0),
    previousMoving = useRef(false),
    lastThreat = useRef(false),
    metrics = useRef({
      distance: 0,
      detections: 0,
      near: 0,
      recoveries: 0,
      waits: 0,
      routeChanges: 0,
      unnecessaryMovement: 0,
      unnecessaryReactions: 0,
      appropriate: 0,
      ignored: 0,
      relevant: 0,
      encounters: 0,
      entries: 0,
      exits: 0,
      timeVision: 0,
      timeHidden: 0,
      timeStationary: 0,
      decisions: 0,
      responseLatency: 0,
      distractionResponses: 0,
      adaptation: 0,
      begin: 0,
      middle: 0,
      end: 0,
      roundsCompleted: 0,
    });
  const [started, setStarted] = useState(false),
    [localTime, setLocalTime] = useState(remainingSeconds),
    [hud, setHud] = useState({ alert: 0, round: 1 });
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(raf.current);
    const m = metrics.current,
      duration = Math.max(1, (performance.now() - startedAt.current) / 1000),
      payload: StealthMetrics = {
        sessionDuration: Math.round(duration),
        distanceTravelled: Math.round(m.distance),
        exitReached: m.roundsCompleted >= 2,
        roundsCompleted: m.roundsCompleted,
        detectionCount: m.near + m.detections,
        nearDetectionCount: m.near,
        fullDetectionCount: m.detections,
        recoveryCount: m.recoveries,
        hideCount: m.exits,
        waitCount: m.waits,
        routeChanges: m.routeChanges,
        unnecessaryMovement: Math.round(m.unnecessaryMovement),
        unnecessaryReactions: m.unnecessaryReactions,
        appropriateResponses: m.appropriate,
        ignoredIrrelevantEvents: m.ignored,
        respondedRelevantEvents: m.relevant,
        guardEncounters: m.encounters,
        visionEntries: m.entries,
        visionExits: m.exits,
        timeInVision: Math.round(m.timeVision),
        timeHidden: Math.round(m.timeHidden),
        timeStationary: Math.round(m.timeStationary),
        movementConsistency: Math.max(0, 100 - m.routeChanges * 2),
        decisionFrequency: m.decisions,
        responseLatency: Math.round(m.responseLatency),
        distractionResponses: m.distractionResponses,
        guardPatternAdaptation: Math.round(m.adaptation),
        beginningPerformance: Math.round(m.begin),
        middlePerformance: Math.round(m.middle),
        endingPerformance: Math.round(m.end),
        highestDifficulty: difficultyFor(duration),
        completionStatus: "COMPLETED",
      };
    onComplete?.(scoreStealth(payload));
  }, [onComplete]);
  useEffect(() => {
    if (started && !practiceOnly && remainingSeconds <= 0)
      ending.current = true;
  }, [started, practiceOnly, remainingSeconds]);
  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const id = setInterval(() => setLocalTime((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [started, practiceOnly, disabled]);
  useEffect(() => {
    if (started && practiceOnly && localTime <= 0) ending.current = true;
  }, [started, practiceOnly, localTime]);
  useEffect(() => {
    if (!started || disabled) return;
    const el = canvas.current,
      ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    startedAt.current = performance.now();
    last.current = startedAt.current;
    const resize = () => {
      const d = Math.min(devicePixelRatio || 1, 2),
        b = el.getBoundingClientRect();
      el.width = b.width * d;
      el.height = b.height * d;
      ctx.setTransform((d * b.width) / W, 0, 0, (d * b.height) / H, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    const down = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - last.current) / 1000),
        elapsed = (now - startedAt.current) / 1000;
      last.current = now;
      const input = {
          x:
            (keys.current.has("ArrowRight") || keys.current.has("KeyD")
              ? 1
              : 0) -
            (keys.current.has("ArrowLeft") || keys.current.has("KeyA")
              ? 1
              : 0) +
            stick.current.x,
          y:
            (keys.current.has("ArrowDown") || keys.current.has("KeyS")
              ? 1
              : 0) -
            (keys.current.has("ArrowUp") || keys.current.has("KeyW") ? 1 : 0) +
            stick.current.y,
        },
        p = player.current,
        m = metrics.current,
        oldX = p.x,
        oldY = p.y;
      movePlayer(p, input, dt, walls.current);
      m.distance += Math.hypot(p.x - oldX, p.y - oldY);
      if (p.moving !== previousMoving.current) {
        m.decisions++;
        if (!p.moving) m.waits++;
        previousMoving.current = p.moving;
      }
      const difficulty = Math.min(
        guards.current.length,
        difficultyFor(elapsed) + round.current - 1,
      );
      let visible = false,
        maxAwareness = 0;
      for (let i = 0; i < guards.current.length; i++) {
        const g = guards.current[i];
        if (i < difficulty) stepGuard(g, dt, difficulty);
        const detection =
          i < difficulty
            ? stepDetection(g, p, walls.current, dt)
            : {
                visible: false,
                entered: false,
                near: false,
                detected: false,
                recovered: false,
              };
        visible ||= detection.visible;
        maxAwareness = Math.max(maxAwareness, g.awareness);
        if (detection.entered) {
          m.entries++;
          m.encounters++;
        }
        if (detection.near) m.near++;
        if (detection.detected) m.detections++;
        if (detection.recovered) {
          m.recoveries++;
          m.exits++;
        }
        if (detection.visible) m.timeVision += dt;
      }
      if (visible && !lastThreat.current && !p.moving) m.appropriate++;
      if (!visible && lastThreat.current && !p.moving) m.appropriate++;
      lastThreat.current = visible;
      if (!visible && !p.moving) m.timeHidden += dt;
      if (!p.moving) m.timeStationary += dt;
      const segment = Math.min(2, Math.floor(elapsed / 60));
      if (maxAwareness < 45) {
        if (segment === 0) m.begin += dt;
        else if (segment === 1) m.middle += dt;
        else m.end += dt;
      }
      if (elapsed >= nextEvent.current && !ending.current) {
        events.current.push(createEvent(attemptSeed, Math.floor(elapsed / 5)));
        nextEvent.current = elapsed + 4.5 + (attemptSeed % 3) * 0.4;
      }
      for (const e of events.current) {
        const was = e.active;
        stepEvent(e, dt);
        if (
          was &&
          e.active &&
          p.moving &&
          Math.hypot(p.x - e.x, p.y - e.y) < 240
        ) {
          m.distractionResponses += dt;
          if (!e.relevant) m.unnecessaryMovement += dt;
        }
        if (was && !e.active) {
          if (!e.relevant && !p.moving) m.ignored++;
          if (e.relevant && p.moving) m.relevant++;
        }
      }
      events.current = events.current.filter((e) => e.life > -0.5);
      const exit = exitForRound(round.current);
      if (now % 120 < 45)
        setHud({ alert: Math.round(maxAwareness), round: round.current });
      draw(
        ctx,
        now,
        elapsed,
        p,
        walls.current,
        guards.current.slice(0, difficulty),
        events.current,
        maxAwareness,
        exit,
        round.current,
        now < roundFlashUntil.current,
      );
      if (atExit(p, exit)) {
        m.roundsCompleted++;
        if (round.current === 1) {
          round.current = 2;
          roundFlashUntil.current = now + 1400;
          const nextPlayer = createPlayer();
          nextPlayer.x = 925;
          player.current = nextPlayer;
          walls.current = wallsFor(attemptSeed + 101);
          guards.current = createGuards(attemptSeed + 101);
          events.current = [];
          nextEvent.current = elapsed + 3;
          lastThreat.current = false;
          setHud({ alert: 0, round: 2 });
        } else ending.current = true;
      }
      if (ending.current) {
        finish();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [started, disabled, attemptSeed, finish]);
  const time = practiceOnly ? localTime : remainingSeconds;
  if (!started)
    return (
      <div className="se-start">
        <section>
          <small>NIGHT OPERATIONS // SECTOR 07</small>
          <h1>
            STEALTH
            <br />
            <em>ESCAPE</em>
          </h1>
          <p>Complete two escape sectors without drawing attention.</p>
          <div>
            <span>WASD</span>
            <b>MOVE</b>
            <span>ARROWS</span>
            <b>MOVE</b>
          </div>
          <button onClick={() => setStarted(true)}>ENTER SECTOR</button>
        </section>
      </div>
    );
  return (
    <div className="se-game">
      <header>
        <div>
          <small>SECTOR 07</small>
          <b>STEALTH ESCAPE</b>
        </div>
        <div className="se-objective">
          ROUND {hud.round} / 2 · REACH EXTRACTION
        </div>
        <div className="se-clock">
          {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
        </div>
      </header>
      <canvas ref={canvas} />
      <div className="se-alert">
        <span>VISIBILITY</span>
        <i>
          <b style={{ width: `${hud.alert}%` }} />
        </i>
      </div>
      <div
        className="se-pad"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          stick.current = {
            x: (e.clientX - r.left - r.width / 2) / (r.width / 2),
            y: (e.clientY - r.top - r.height / 2) / (r.height / 2),
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const r = e.currentTarget.getBoundingClientRect();
          stick.current = {
            x: Math.max(
              -1,
              Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)),
            ),
            y: Math.max(
              -1,
              Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)),
            ),
          };
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          stick.current = { x: 0, y: 0 };
        }}
      >
        <i />
      </div>
    </div>
  );
}
function draw(
  ctx: CanvasRenderingContext2D,
  now: number,
  elapsed: number,
  p: Player,
  walls: Rect[],
  guards: Guard[],
  events: Event[],
  alert: number,
  exit: Vec,
  round: number,
  roundFlash: boolean,
) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#07151f";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#15313d";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#092f32";
  ctx.fillRect(exit.x - 30, exit.y - 32, 60, 65);
  ctx.strokeStyle = "#65f6d0";
  ctx.lineWidth = 4;
  ctx.strokeRect(exit.x - 19, exit.y - 25, 37, 50);
  ctx.fillStyle = "#8affd7";
  ctx.font = "800 10px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("EXIT", exit.x, exit.y + 47);
  for (const g of guards) {
    const blocked = lineBlocked(g, p, walls),
      a = canSee(g, p, walls);
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.arc(0, 0, 205, -0.58, 0.58);
    ctx.closePath();
    ctx.fillStyle = a ? "#ff51512e" : blocked ? "#d3eeff0b" : "#f5d86e1d";
    ctx.fill();
    ctx.restore();
  }
  for (const r of walls) {
    ctx.fillStyle = r.kind === "cover" ? "#354b4c" : "#172b35";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = r.kind === "cover" ? "#77958e" : "#294653";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (r.kind === "cover") {
      ctx.strokeStyle = "#253b3c";
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.w, r.y + r.h);
      ctx.moveTo(r.x + r.w, r.y);
      ctx.lineTo(r.x, r.y + r.h);
      ctx.stroke();
    }
  }
  for (const e of events) {
    if (!e.active) continue;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = Math.min(1, e.life);
    if (e.kind === "SOUND") {
      ctx.fillStyle = "#254d5e";
      ctx.fillRect(-15, -12, 20, 24);
      ctx.fillStyle = "#78d7ef";
      ctx.beginPath();
      ctx.arc(-5, 0, 5, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#78d7ef";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(2, 0, 13 + i * 11 + (2.4 - e.life) * 5, -0.7, 0.7);
        ctx.stroke();
      }
    } else if (e.kind === "LIGHT") {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 55);
      glow.addColorStop(0, "#fff4a2aa");
      glow.addColorStop(1, "#ffe16b00");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#ffe36f";
      ctx.fillRect(-11, -5, 22, 10);
      ctx.strokeStyle = "#fff9c7";
      ctx.lineWidth = 2;
      ctx.strokeRect(-11, -5, 22, 10);
    } else {
      const stride = Math.sin(now * 0.018) * 5;
      ctx.fillStyle = "#9a76bd99";
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#9a76bd99";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(-7 - stride, 18);
      ctx.moveTo(0, -2);
      ctx.lineTo(7 + stride, 18);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const g of guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.fillStyle = g.awareness > 70 ? "#ff5367" : "#e6b85e";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#091722";
    ctx.fillRect(-7, -5, 20, 10);
    ctx.fillStyle = "#fff";
    ctx.fillRect(8, -2, 4, 4);
    ctx.restore();
    if (g.awareness > 5) {
      ctx.fillStyle = "#102631";
      ctx.fillRect(g.x - 22, g.y - 26, 44, 4);
      ctx.fillStyle = g.awareness > 70 ? "#ff5264" : "#f3d96b";
      ctx.fillRect(g.x - 22, g.y - 26, (44 * g.awareness) / 100, 4);
    }
  }
  const walk = Math.sin(now * 0.018) * 3;
  ctx.fillStyle = alert > 90 ? "#ff6175" : "#57f2c2";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 5, 13, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "#b9fff0";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + 6);
  ctx.lineTo(p.x - 8 - walk, p.y + 19);
  ctx.moveTo(p.x, p.y + 6);
  ctx.lineTo(p.x + 8 + walk, p.y + 19);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 7px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("07", p.x, p.y - 2);
  if (roundFlash) {
    ctx.fillStyle = "#06141de6";
    ctx.fillRect(330, 235, 340, 110);
    ctx.strokeStyle = "#68e8ce";
    ctx.lineWidth = 2;
    ctx.strokeRect(330, 235, 340, 110);
    ctx.fillStyle = "#68e8ce";
    ctx.font = "900 13px ui-monospace, monospace";
    ctx.fillText(`SECTOR ${round} / 2`, 500, 272);
    ctx.fillStyle = "#fff";
    ctx.font = "900 27px system-ui";
    ctx.fillText("NEW EXTRACTION SECTOR", 500, 314);
  }
}
