"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCollision,
  collectibleCollision,
  createRider,
  createWave,
  difficultyFor,
  generateCollectible,
  generateObstacle,
  obstacleCollision,
  recoverRider,
  startJump,
  stepBalance,
  stepCollectible,
  stepJump,
  stepObstacle,
  stepWave,
  waveHeight,
  type Collectible,
  type Obstacle,
  type RiderState,
  type WaveState,
} from "./Engines";
import { scoreWaveRider, type WaveMetrics } from "./ScoringEngine";
import "./WaveRiderGame.css";
type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  sound?: boolean;
  attemptSeed?: number;
  onComplete?: (m: WaveMetrics) => void;
};
const W = 1000,
  H = 600,
  SURFACE = 365;
export default function WaveRiderGame({
  disabled = false,
  remainingSeconds = 180,
  practiceOnly = false,
  attemptSeed = 0,
  onComplete,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    raf = useRef(0),
    last = useRef(0),
    start = useRef(0),
    done = useRef(false),
    ending = useRef(false),
    wave = useRef(createWave(attemptSeed)),
    rider = useRef(createRider()),
    input = useRef(0),
    keys = useRef(new Set<string>()),
    obstacles = useRef<Obstacle[]>([]),
    collectibles = useRef<Collectible[]>([]),
    nextObstacle = useRef(0),
    nextCollectible = useRef(2.5),
    lastDirection = useRef(1),
    fallRecovery = useRef(0),
    samples = useRef<number[]>([]),
    segments = useRef([0, 0, 0]),
    metric = useRef({
      stable: 0,
      unstable: 0,
      critical: 0,
      falls: 0,
      recoveries: 0,
      over: 0,
      undershoot: 0,
      correction: 0,
      correctionTime: 0,
      adaptation: 0,
      waveChanges: 0,
      directionChanges: 0,
      heightChanges: 0,
      encountered: 0,
      avoided: 0,
      collisions: 0,
      collectibles: 0,
      collectibleMisses: 0,
      inputChanges: 0,
      lastInput: 0,
    });
  const [started, setStarted] = useState(false),
    [hud, setHud] = useState({
      distance: 0,
      stability: 100,
      difficulty: 1,
      falls: 0,
      collectibles: 0,
    }),
    [localTime, setLocalTime] = useState(remainingSeconds);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(raf.current);
    const elapsed = Math.max(1, (performance.now() - start.current) / 1000),
      m = metric.current,
      avg =
        samples.current.reduce((a, b) => a + b, 0) /
        Math.max(1, samples.current.length),
      variance =
        samples.current.reduce((a, b) => a + Math.abs(b - avg), 0) /
        Math.max(1, samples.current.length),
      payload: WaveMetrics = {
        sessionDuration: Math.round(elapsed),
        distanceTravelled: Math.round(elapsed * 42),
        stableDuration: Math.round(m.stable),
        unstableDuration: Math.round(m.unstable),
        criticalDuration: Math.round(m.critical),
        fallCount: m.falls,
        recoveryCount: m.recoveries,
        balanceOffset: Math.round(rider.current.balanceOffset),
        averageBalanceOffset: Math.round(avg),
        balanceVariance: Math.round(variance),
        overcorrectionCount: m.over,
        undershootCount: m.undershoot,
        correctionMagnitude: Math.round(m.correction),
        correctionTime: Math.round(m.correctionTime),
        adaptationTime: Math.round(
          m.adaptation / Math.max(1, m.directionChanges),
        ),
        waveChanges: m.waveChanges,
        waveDirectionChanges: m.directionChanges,
        waveHeightChanges: m.heightChanges,
        obstaclesEncountered: m.encountered,
        obstaclesAvoided: m.avoided,
        obstacleCollisions: m.collisions,
        collectiblesCollected: m.collectibles,
        collectiblesMissed: m.collectibleMisses,
        movementConsistency: Math.max(0, Math.round(100 - variance * 2.4)),
        responseConsistency: Math.max(0, Math.round(100 - m.over * 3)),
        beginningPerformance: Math.round(segments.current[0]),
        middlePerformance: Math.round(segments.current[1]),
        endingPerformance: Math.round(segments.current[2]),
        highestDifficulty: difficultyFor(elapsed),
        completionStatus: "COMPLETED",
      };
    onComplete?.(scoreWaveRider(payload));
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
    start.current = performance.now();
    last.current = start.current;
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
    const updateInput = () => {
      input.current =
        (keys.current.has("ArrowRight") || keys.current.has("KeyD") ? 1 : 0) -
        (keys.current.has("ArrowLeft") || keys.current.has("KeyA") ? 1 : 0);
    };
    const kd = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) startJump(rider.current);
        return;
      }
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code)) {
        e.preventDefault();
        keys.current.add(e.code);
        updateInput();
      }
    };
    const ku = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      updateInput();
    };
    let pointerX = 0;
    const pd = (e: PointerEvent) => {
      pointerX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const pm = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      const dx = e.clientX - pointerX;
      pointerX = e.clientX;
      input.current = Math.max(-1, Math.min(1, dx / 32));
    };
    const pu = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      input.current = 0;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerup", pu);
    el.addEventListener("pointercancel", pu);
    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last.current) / 1000),
        elapsed = (now - start.current) / 1000;
      last.current = now;
      stepWave(wave.current, dt, elapsed);
      stepJump(rider.current, dt);
      const m = metric.current;
      if (wave.current.direction !== lastDirection.current) {
        lastDirection.current = wave.current.direction;
        m.directionChanges++;
        m.waveChanges++;
        m.adaptation += Math.abs(rider.current.rotation) * 1.8;
      }
      const effect = stepBalance(
        rider.current,
        wave.current,
        input.current,
        dt,
        elapsed,
      );
      samples.current.push(
        Math.abs(rider.current.balanceOffset) +
          Math.abs(rider.current.rotation) * 18,
      );
      if (effect.stable) m.stable += dt;
      else m.unstable += dt;
      if (effect.critical) m.critical += dt;
      if (effect.overcorrected) m.over++;
      if (Math.abs(input.current) > 0)
        m.correction += Math.abs(input.current) * dt;
      if (input.current !== m.lastInput) {
        m.inputChanges++;
        m.lastInput = input.current;
      }
      const segment = Math.min(2, Math.floor(elapsed / 60));
      segments.current[segment] += effect.stable ? (dt * 100) / 60 : 0;
      if (effect.fallen) {
        m.falls++;
        fallRecovery.current = elapsed + 1.25;
      }
      if (rider.current.falling && elapsed >= fallRecovery.current) {
        recoverRider(rider.current);
        m.recoveries++;
      }
      if (elapsed >= nextObstacle.current && !ending.current) {
        obstacles.current.push(
          generateObstacle(
            attemptSeed,
            Math.floor(elapsed / 4) + obstacles.current.length,
            wave.current.difficulty,
          ),
        );
        nextObstacle.current =
          elapsed + Math.max(3.4, 7.2 - wave.current.difficulty * 0.48);
      }
      for (const o of obstacles.current) {
        stepObstacle(o, dt);
        const sy =
          SURFACE + waveHeight(wave.current, o.x + elapsed * 42) * 0.52;
        if (
          o.active &&
          o.x < rider.current.x + 95 &&
          !o.id.toString().startsWith("-")
        ) {
          m.encountered++;
          o.id = -Math.abs(o.id || 1);
        }
        if (obstacleCollision(rider.current, o, sy)) {
          applyCollision(rider.current, o);
          m.collisions++;
        }
        if (o.active && o.x < 120) {
          o.active = false;
          m.avoided++;
        }
      }
      obstacles.current = obstacles.current.filter((o) => o.x > -100);
      if (elapsed >= nextCollectible.current && !ending.current) {
        collectibles.current.push(
          generateCollectible(
            attemptSeed,
            collectibles.current.length + Math.floor(elapsed),
            wave.current.difficulty,
          ),
        );
        nextCollectible.current = elapsed + 4.2;
      }
      for (const c of collectibles.current) {
        stepCollectible(c, dt);
        const sy =
          SURFACE + waveHeight(wave.current, c.x + elapsed * 42) * 0.52;
        if (collectibleCollision(rider.current, c, sy)) {
          c.active = false;
          m.collectibles++;
        } else if (c.active && c.x < 100) {
          c.active = false;
          m.collectibleMisses++;
        }
      }
      collectibles.current = collectibles.current.filter((c) => c.x > -80);
      if (now % 100 < 45)
        setHud({
          distance: Math.round(elapsed * 42),
          stability: Math.round(rider.current.stability),
          difficulty: wave.current.difficulty,
          falls: m.falls,
          collectibles: m.collectibles,
        });
      draw(
        ctx,
        now,
        elapsed,
        wave.current,
        rider.current,
        obstacles.current,
        collectibles.current,
        input.current,
      );
      if (ending.current && !rider.current.falling) {
        finish();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerup", pu);
      el.removeEventListener("pointercancel", pu);
    };
  }, [started, disabled, attemptSeed, finish]);
  const time = practiceOnly ? localTime : remainingSeconds;
  if (!started)
    return (
      <div className="wr-start">
        <section>
          <small>APEX SURF // PACIFIC RUN</small>
          <h1>
            WAVE
            <br />
            <em>RIDER</em>
          </h1>
          <p>
            Keep the board level with continuous left and right corrections,
            jump over hazards, and collect floating stars. The board will not
            straighten itself.
          </p>
          <div>
            <span>← →</span>
            <b>LEAN</b>
            <span>SPACE / ↑</span>
            <b>JUMP</b>
            <span>↔</span>
            <b>DRAG</b>
          </div>
          <button onClick={() => setStarted(true)}>PADDLE OUT</button>
        </section>
      </div>
    );
  return (
    <div className="wr-game">
      <header>
        <div>
          <small>APEX SURF</small>
          <b>WAVE RIDER</b>
        </div>
        <div className="wr-distance">
          <strong>{hud.distance}</strong>
          <span>METRES</span>
        </div>
        <div className="wr-clock">
          {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
        </div>
      </header>
      <canvas ref={canvas} />
      <div className="wr-collected">✦ {hud.collectibles}</div>
      <button
        className="wr-jump"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startJump(rider.current);
        }}
      >
        JUMP <small>SPACE / ↑</small>
      </button>
      <footer>
        <span>
          SWELL <b>{hud.difficulty}</b>
        </span>
        <div className="wr-stability">
          <i style={{ width: `${hud.stability}%` }} />
        </div>
        <span>
          FALLS <b>{hud.falls}</b>
        </span>
      </footer>
    </div>
  );
}
function draw(
  ctx: CanvasRenderingContext2D,
  now: number,
  elapsed: number,
  w: WaveState,
  r: RiderState,
  obstacles: Obstacle[],
  collectibles: Collectible[],
  input: number,
) {
  ctx.clearRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#278bb9");
  sky.addColorStop(0.48, "#a8dfe1");
  sky.addColorStop(0.73, "#ffd18d");
  sky.addColorStop(1, "#eb8d66");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(790, 108, 4, 790, 108, 78);
  sun.addColorStop(0, "#fffbd0");
  sun.addColorStop(0.28, "#ffe9a4aa");
  sun.addColorStop(1, "#ffe59a00");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(790, 108, 78, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#fff8";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 260 - elapsed * 8) % 1300) - 130,
      y = 83 + (i % 2) * 38;
    ctx.beginPath();
    ctx.ellipse(x, y, 66, 13, 0, 0, 7);
    ctx.ellipse(x + 38, y - 9, 42, 18, 0, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = "#355f6c";
  ctx.beginPath();
  ctx.moveTo(0, 284);
  ctx.lineTo(130, 194);
  ctx.lineTo(220, 270);
  ctx.lineTo(330, 212);
  ctx.lineTo(430, 286);
  ctx.lineTo(0, 286);
  ctx.fill();
  ctx.fillStyle = "#176153";
  ctx.beginPath();
  ctx.moveTo(0, 282);
  ctx.lineTo(135, 215);
  ctx.lineTo(220, 282);
  ctx.fill();
  const base = SURFACE;
  ctx.fillStyle = "#087d9b";
  ctx.fillRect(0, base, W, H - base);
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, base + waveHeight(w, elapsed * 42) * 0.52);
  for (let x = 0; x <= W; x += 6) {
    const y = base + waveHeight(w, x + elapsed * 42) * 0.52;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  const ocean = ctx.createLinearGradient(0, base, 0, H);
  ocean.addColorStop(0, "#1bc4cd");
  ocean.addColorStop(0.32, "#078bab");
  ocean.addColorStop(1, "#06466e");
  ctx.fillStyle = ocean;
  ctx.fill();
  // a moving swell behind the rider gives the wave volume and forward energy
  const crestX = 610 - Math.sin(elapsed * 0.42) * 70;
  ctx.fillStyle = "#0c91acaa";
  ctx.beginPath();
  ctx.moveTo(crestX - 170, H);
  ctx.quadraticCurveTo(crestX - 65, 245, crestX + 25, 335);
  ctx.quadraticCurveTo(crestX + 105, 420, crestX + 220, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d8ffff";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(crestX - 70, 303);
  ctx.quadraticCurveTo(crestX - 18, 265, crestX + 30, 331);
  ctx.stroke();
  ctx.strokeStyle = "#d7ffff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 5) {
    const y = base + waveHeight(w, x + elapsed * 42) * 0.52;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < 46; i++) {
    const x = (i * 83 - elapsed * 72) % 1100,
      y = base + 40 + ((i * 31) % 180);
    ctx.fillStyle = i % 3 ? "#55d5df55" : "#d9ffff65";
    ctx.beginPath();
    ctx.ellipse(x, y, 15 + (i % 4) * 3, 2.5, 0, 0, 7);
    ctx.fill();
  }
  for (const o of obstacles) {
    if (!o.active) continue;
    const y =
      base +
      waveHeight(w, o.x + elapsed * 42) * 0.52 +
      o.offsetY +
      Math.sin(o.bob) * 5;
    drawObstacle(ctx, o, y);
  }
  for (const c of collectibles) {
    if (!c.active) continue;
    const surface = base + waveHeight(w, c.x + elapsed * 42) * 0.52;
    drawCollectible(ctx, c, surface - c.height);
  }
  const surfaceY = base + waveHeight(w, r.x + elapsed * 42) * 0.52 - 5,
    surferY = surfaceY - r.jumpHeight;
  drawWake(ctx, r.x + r.balanceOffset * 0.72, surfaceY, elapsed, r.grounded);
  drawSurfer(
    ctx,
    r.x + r.balanceOffset * 0.72,
    surferY,
    Math.max(-0.72, Math.min(0.72, r.rotation)),
    input,
    r.falling,
  );
  ctx.fillStyle = "#062d49cc";
  ctx.beginPath();
  ctx.roundRect(25, 28, 170, 50, 6);
  ctx.fill();
  ctx.fillStyle = "#70e8e7";
  ctx.font = "800 9px system-ui";
  ctx.fillText("CURRENT", 40, 47);
  ctx.fillStyle = "#fff";
  ctx.font = "900 18px system-ui";
  ctx.fillText(`${Math.round(w.speed * 18)} KT`, 40, 68);
}
function drawCollectible(ctx: CanvasRenderingContext2D, c: Collectible, y: number) {
  ctx.save();
  ctx.translate(c.x, y);
  ctx.rotate(c.spin);
  ctx.shadowColor = "#ffe36b";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffd447";
  ctx.strokeStyle = "#fff4a8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 7 : 16;
    const x = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, py);
    else ctx.lineTo(x, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawWake(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  grounded: boolean,
) {
  ctx.fillStyle = "#d9ffffaa";
  for (let i = 0; i < (grounded ? 18 : 7); i++) {
    const d = (i * 17 + t * 45) % 150,
      py = y + 7 + Math.sin(i * 2.1 + t * 5) * 10;
    ctx.beginPath();
    ctx.arc(x - 35 - d, py, 2 + (i % 4), 0, 7);
    ctx.fill();
  }
  ctx.strokeStyle = "#d8ffff99";
  ctx.lineWidth = grounded ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(x - 38, y + 6);
  ctx.quadraticCurveTo(x - 100, y + 28, x - 180, y + 14);
  ctx.stroke();
}
function drawSurfer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  input: number,
  falling: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(0.72, 0.72);
  ctx.fillStyle = "#f6cf66";
  ctx.shadowColor = "#d7ffff";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(0, 7, 70, 10, 0, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ef5b5b";
  ctx.lineWidth = 3;
  ctx.stroke();
  const crouch = Math.abs(rotation) * 12 + (falling ? 10 : 0);
  ctx.strokeStyle = "#18283c";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-15, -12 + crouch);
  ctx.lineTo(-34, 2);
  ctx.moveTo(13, -11 + crouch);
  ctx.lineTo(34, 1);
  ctx.stroke();
  ctx.fillStyle = "#f05c62";
  ctx.beginPath();
  ctx.roundRect(-20, -72 + crouch, 40, 58, 12);
  ctx.fill();
  ctx.fillStyle = "#dca278";
  ctx.beginPath();
  ctx.arc(0, -88 + crouch, 15, 0, 7);
  ctx.fill();
  ctx.fillStyle = "#142d45";
  ctx.beginPath();
  ctx.arc(-3, -93 + crouch, 16, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#dca278";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-15, -58 + crouch);
  ctx.lineTo(-48 - input * 20, -34 + crouch);
  ctx.moveTo(15, -58 + crouch);
  ctx.lineTo(48 - input * 20, -40 + crouch);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 9px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("WR", 0, -44 + crouch);
  ctx.restore();
}
function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, y: number) {
  ctx.save();
  ctx.translate(o.x, y);
  if (o.type === "BUOY") {
    ctx.fillStyle = "#ef4d58";
    ctx.beginPath();
    ctx.ellipse(0, 1, 19, 14, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#fff2d0";
    ctx.fillRect(-16, -3, 32, 7);
    ctx.fillStyle = "#a51f35";
    ctx.fillRect(-3, -34, 6, 25);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -36, 8, Math.PI, 0);
    ctx.stroke();
  } else if (o.type === "DRIFTWOOD") {
    ctx.rotate(Math.sin(o.bob) * 0.15);
    ctx.fillStyle = "#7a4c2a";
    ctx.beginPath();
    ctx.roundRect(-32, -8, 64, 16, 8);
    ctx.fill();
    ctx.strokeStyle = "#ad7543";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#435b63";
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.lineTo(-19, -19);
    ctx.lineTo(5, -30);
    ctx.lineTo(28, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7d9697";
    ctx.beginPath();
    ctx.moveTo(-17, -14);
    ctx.lineTo(4, -24);
    ctx.lineTo(12, -4);
    ctx.fill();
  }
  ctx.restore();
}
