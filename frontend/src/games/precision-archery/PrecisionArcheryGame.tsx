"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  aimAngle,
  ARCHER,
  drawFromDistance,
  launchArrow,
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
import { Arrow, ArcheryMetrics, ShotRecord, Target, Vec } from "./Types";
import "./PrecisionArcheryGame.css";

type Props = {
  remainingSeconds?: number;
  practiceOnly?: boolean;
  disabled?: boolean;
  onComplete?: (metrics: ArcheryMetrics) => void;
  onBack?: () => void;
};
export default function PrecisionArcheryGame({
  remainingSeconds = 120,
  practiceOnly = false,
  disabled = false,
  onComplete,
  onBack,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    raf = useRef(0),
    last = useRef(0),
    elapsed = useRef(0),
    aim = useRef<Vec>({ x: 650, y: 210 }),
    angle = useRef(-0.25),
    drawing = useRef(false),
    drawStart = useRef(0),
    draw = useRef(0),
    followThrough = useRef(0),
    arrow = useRef<Arrow | null>(null),
    targets = useRef<Target[]>(createTargets(1, 3)),
    shots = useRef<ShotRecord[]>([]),
    embeddedArrows = useRef<
      { targetId: number; dx: number; dy: number; angle: number }[]
    >([]),
    aimSamples = useRef<number[]>([]),
    lastShot = useRef(0),
    done = useRef(false),
    level = useRef(1),
    wind = useRef(0);
  const [started, setStarted] = useState(false),
    [localTime, setLocalTime] = useState(remainingSeconds),
    [showRoundTwo, setShowRoundTwo] = useState(false),
    [phase, setPhase] = useState(
      "DRAG TO AIM · HOLD TO DRAW · RELEASE TO SHOOT",
    );
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete?.(
      scoreArchery(
        shots.current,
        level.current,
        Math.max(0, 120 - (practiceOnly ? localTime : remainingSeconds)),
      ),
    );
  }, [localTime, onComplete, practiceOnly, remainingSeconds]);
  useEffect(() => {
    if (!started || done.current) return;
    if (
      (practiceOnly ? localTime : remainingSeconds) <= 0 &&
      !arrow.current?.active
    )
      finish();
  }, [started, localTime, remainingSeconds, practiceOnly, finish]);
  useEffect(() => {
    if (!started || !practiceOnly) return;
    const id = window.setInterval(
      () => setLocalTime((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [started, practiceOnly]);
  const drawScene = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const w = 900,
      h = 560;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#75d7f3");
    sky.addColorStop(0.63, "#dff7f1");
    sky.addColorStop(0.64, "#7ec850");
    sky.addColorStop(1, "#347a34");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff9";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 220 + t * 24) % 1100) - 100;
      ctx.beginPath();
      ctx.ellipse(x, 70 + (i % 2) * 38, 55, 18, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#5e9770";
    ctx.beginPath();
    ctx.moveTo(300, 360);
    ctx.lineTo(510, 120);
    ctx.lineTo(680, 360);
    ctx.fill();
    ctx.fillStyle = "#477d62";
    ctx.beginPath();
    ctx.moveTo(480, 360);
    ctx.lineTo(700, 160);
    ctx.lineTo(850, 360);
    ctx.fill();
    if (wind.current !== 0) {
      const direction = Math.sign(wind.current);
      ctx.strokeStyle = "#ffffffaa";
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const travel = (t * (55 + Math.abs(wind.current) * 2) + i * 145) % 1050;
        const wx = direction > 0 ? travel - 80 : 980 - travel;
        const wy = 145 + (i % 4) * 43;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(
          wx + direction * 25,
          wy + Math.sin(t * 4 + i) * 7,
          wx + direction * 58,
          wy,
        );
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        const travel =
          (t * (42 + Math.abs(wind.current) * 2.4) + i * 177) % 1080;
        const leafX = direction > 0 ? travel - 90 : 990 - travel;
        const leafY = 185 + ((i * 67 + Math.sin(t * 2 + i) * 28) % 220);
        ctx.save();
        ctx.translate(leafX, leafY);
        ctx.rotate(t * direction * 4 + i);
        ctx.fillStyle = i % 2 ? "#d97706" : "#65a30d";
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = "#d9b978";
    ctx.fillRect(50, 438, 800, 76);
    ctx.strokeStyle = "#fff8";
    ctx.lineWidth = 3;
    for (let x = 210; x < 870; x += 130) {
      ctx.beginPath();
      ctx.moveTo(x, 438);
      ctx.lineTo(x, 514);
      ctx.stroke();
    }
    const flag = wind.current >= 0 ? 1 : -1;
    ctx.strokeStyle = "#603813";
    ctx.beginPath();
    ctx.moveTo(55, 130);
    ctx.lineTo(55, 250);
    ctx.stroke();
    ctx.fillStyle = "#ffca28";
    ctx.beginPath();
    ctx.moveTo(55, 130);
    ctx.lineTo(
      wind.current === 0 ? 72 : 55 + flag * 70,
      wind.current === 0 ? 178 : 145 + Math.sin(t * 5) * 6,
    );
    ctx.lineTo(55, 165);
    ctx.fill();
    ctx.fillStyle = "#17324d";
    ctx.font = "700 13px system-ui";
    ctx.fillText(
      wind.current === 0 ? "CALM" : `WIND ${flag > 0 ? "→" : "←"}`,
      28,
      115,
    );
    targets.current.forEach((target) => {
      const p = targetPosition(target, t);
      target.x = p.x;
      target.y = p.y;
      target.hitFlash = Math.max(0, target.hitFlash - 0.03);
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.rotate(target.hitFlash * Math.sin(t * 20) * 0.05);
      ctx.fillStyle = "#77472b";
      ctx.fillRect(-5, target.radius, 10, 110);
      for (const [r, c] of [
        [1, "#f8fafc"],
        [0.78, "#ef4444"],
        [0.55, "#f8fafc"],
        [0.32, "#2563eb"],
        [0.14, "#facc15"],
      ] as [number, string][]) {
        ctx.beginPath();
        ctx.fillStyle = c;
        ctx.arc(0, 0, target.radius * r, 0, 7);
        ctx.fill();
      }
      if (target.hitFlash) {
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, target.radius + 10 + target.hitFlash * 12, 0, 7);
        ctx.stroke();
      }
      embeddedArrows.current
        .filter((stuck) => stuck.targetId === target.id)
        .forEach((stuck) => {
          ctx.save();
          ctx.translate(stuck.dx, stuck.dy);
          ctx.rotate(stuck.angle);
          ctx.strokeStyle = "#3b2f22";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-42, 0);
          ctx.lineTo(0, 0);
          ctx.stroke();
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(3, 0);
          ctx.lineTo(-7, -6);
          ctx.lineTo(-7, 6);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#172554";
          ctx.beginPath();
          ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      ctx.restore();
    });
    const a = angle.current,
      d = draw.current,
      breathe = Math.sin(t * 3) * 1.5;
    ctx.save();
    ctx.translate(ARCHER.x, ARCHER.y + breathe);
    // Animated sport archer: planted legs, torso, head and hair.
    ctx.strokeStyle = "#172554";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-43, 76);
    ctx.lineTo(-53, 111);
    ctx.lineTo(-64, 145);
    ctx.lineTo(-78, 145);
    ctx.moveTo(-27, 76);
    ctx.lineTo(-19, 112);
    ctx.lineTo(-8, 145);
    ctx.lineTo(7, 145);
    ctx.stroke();
    ctx.fillStyle = "#1e3a70";
    ctx.beginPath();
    ctx.roundRect(-58, 62, 47, 28, 7);
    ctx.fill();
    ctx.fillStyle = "#2563a8";
    ctx.beginPath();
    ctx.roundRect(-58, -15, 47, 96, 14);
    ctx.fill();
    ctx.fillStyle = "#f4c7a1";
    ctx.fillRect(-43, -29, 17, 18);
    ctx.fillStyle = "#f4c7a1";
    ctx.beginPath();
    ctx.arc(-35, -49, 25, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#38291f";
    ctx.beginPath();
    ctx.arc(-39, -56, 25, Math.PI, Math.PI * 2);
    ctx.lineTo(-12, -49);
    ctx.quadraticCurveTo(-17, -78, -47, -78);
    ctx.fill();
    ctx.fillStyle = "#172554";
    ctx.fillRect(-62, -75, 48, 8);
    ctx.beginPath();
    ctx.moveTo(-16, -72);
    ctx.lineTo(4, -66);
    ctx.lineTo(-16, -63);
    ctx.fill();
    ctx.fillStyle = "#172554";
    ctx.beginPath();
    ctx.arc(-22, -50, 2.5, 0, 7);
    ctx.fill();
    // Front arm stays attached to the grip. Rear arm joins the string only while drawing.
    const bowX = 48;
    const visibleDraw = drawing.current ? Math.max(0.12, d) : 0;
    const stringX = bowX - visibleDraw * 72;
    const gripWorld = { x: Math.cos(a) * bowX, y: Math.sin(a) * bowX };
    const drawWorld = { x: Math.cos(a) * stringX, y: Math.sin(a) * stringX };
    ctx.strokeStyle = "#f4c7a1";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(12, -4 + Math.sin(a) * 8);
    ctx.lineTo(gripWorld.x, gripWorld.y);
    ctx.stroke();
    if (drawing.current) {
      ctx.beginPath();
      ctx.moveTo(-48, -3);
      ctx.lineTo(-67, -28);
      ctx.lineTo(drawWorld.x, drawWorld.y);
      ctx.stroke();
    } else if (followThrough.current > 0) {
      ctx.beginPath();
      ctx.moveTo(-48, -3);
      ctx.lineTo(-70, -25);
      ctx.lineTo(-60, -48);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-48, -3);
      ctx.lineTo(-62, 22);
      ctx.lineTo(-43, 37);
      ctx.stroke();
    }
    ctx.fillStyle = "#f4c7a1";
    ctx.beginPath();
    ctx.arc(gripWorld.x, gripWorld.y, 7, 0, 7);
    if (drawing.current) ctx.arc(drawWorld.x, drawWorld.y, 7, 0, 7);
    else if (followThrough.current > 0) ctx.arc(-60, -48, 7, 0, 7);
    else ctx.arc(-43, 37, 7, 0, 7);
    ctx.fill();
    ctx.rotate(a);
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(bowX, 0, 48, -1.18, 1.18);
    ctx.stroke();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bowX + 19, -44);
    ctx.lineTo(stringX, 0);
    ctx.lineTo(bowX + 19, 44);
    ctx.stroke();
    if (!arrow.current?.active) {
      ctx.strokeStyle = "#3b2f22";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(stringX, 0);
      ctx.lineTo(94, 0);
      ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.moveTo(98, 0);
      ctx.lineTo(86, -6);
      ctx.lineTo(86, 6);
      ctx.fill();
    }
    ctx.restore();
    if (arrow.current?.active) {
      const ar = arrow.current;
      ctx.strokeStyle = "#fff8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ar.trail.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
      ctx.save();
      ctx.translate(ar.x, ar.y);
      ctx.rotate(ar.angle);
      ctx.strokeStyle = "#493628";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(10, -5);
      ctx.lineTo(10, 5);
      ctx.fill();
      ctx.restore();
    }
    if (!arrow.current?.active) {
      ctx.strokeStyle = "#0f172a99";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(aim.current.x, aim.current.y, 14 + Math.sin(t * 5) * 2, 0, 7);
      ctx.moveTo(aim.current.x - 21, aim.current.y);
      ctx.lineTo(aim.current.x + 21, aim.current.y);
      ctx.moveTo(aim.current.x, aim.current.y - 21);
      ctx.lineTo(aim.current.x, aim.current.y + 21);
      ctx.stroke();
    }
  }, []);
  useEffect(() => {
    if (!started) return;
    const loop = (now: number) => {
      const dt = Math.min(0.025, (now - (last.current || now)) / 1000);
      last.current = now;
      elapsed.current += dt;
      followThrough.current = Math.max(0, followThrough.current - dt);
      // Round 1 contains exactly four shots; Round 2 starts on shot five.
      const nextRound = roundForCompletedShots(shots.current.length);
      if (nextRound !== level.current) {
        level.current = nextRound;
        targets.current = createTargets(nextRound, 3);
        embeddedArrows.current = [];
        setPhase("ROUND 2 · SMALLER TARGET · STRONG WIND ←");
        setShowRoundTwo(true);
      }
      wind.current =
        level.current === 1
          ? 8 + Math.sin(elapsed.current * 0.7) * 2
          : -16 + Math.sin(elapsed.current * 0.55) * 3;
      if (arrow.current?.active) {
        stepArrow(arrow.current, dt, wind.current);
        let result:
          | {
              hit: boolean;
              distance: number;
              ring: "center" | "outer" | "edge" | "miss";
            }
          | undefined;
        let hitTarget: Target | undefined;
        for (const target of targets.current) {
          const c = collision(arrow.current.x, arrow.current.y, target);
          if (c.hit) {
            result = c;
            hitTarget = target;
            target.hitFlash = 1;
            break;
          }
        }
        if (result?.hit || arrow.current.x > 920 || arrow.current.y > 530) {
          if (result?.hit && hitTarget) {
            embeddedArrows.current.push({
              targetId: hitTarget.id,
              dx: 0,
              dy: arrow.current.y - hitTarget.y,
              angle: arrow.current.angle,
            });
          }
          const samples = aimSamples.current;
          shots.current.push({
            aimError: result?.distance ?? 100,
            aimVariance: samples.length
              ? Math.max(...samples) - Math.min(...samples)
              : 0,
            drawAmount: draw.current,
            force: Math.hypot(arrow.current.vx, arrow.current.vy),
            releaseTiming:
              Math.abs(Math.sin(elapsed.current * targets.current[0].speed)) *
              20,
            hitDistance: result?.distance ?? 100,
            ring: result?.ring ?? "miss",
            correctionTime: lastShot.current
              ? (performance.now() - lastShot.current) / 1000
              : 0,
          });
          lastShot.current = performance.now();
          arrow.current.active = false;
          arrow.current = null;
          aimSamples.current = [];
          if (isArcheryComplete(shots.current.length)) {
            setPhase("RANGE COMPLETE");
            finish();
          } else {
            setPhase("AIM · DRAW · RELEASE");
            if ((practiceOnly ? localTime : remainingSeconds) <= 0) finish();
          }
        }
      }
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawScene(ctx, elapsed.current);
      if (!done.current) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [started, drawScene, finish, localTime, practiceOnly, remainingSeconds]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) =>
    pointerToWorld(
      e.clientX,
      e.clientY,
      e.currentTarget.getBoundingClientRect(),
    );
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || arrow.current?.active) return;
    const p = point(e);
    aim.current = p;
    angle.current = Math.max(-1.25, Math.min(0.5, aimAngle(ARCHER, p)));
    aimSamples.current.push((angle.current * 180) / Math.PI);
    if (aimSamples.current.length > 100) aimSamples.current.shift();
    if (drawing.current)
      draw.current = drawFromDistance(
        Math.hypot(p.x - ARCHER.x, p.y - ARCHER.y),
      );
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || arrow.current?.active || !started || showRoundTwo) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    drawStart.current = performance.now();
    draw.current = 0.2;
    move(e);
    setPhase("DRAWING BOW…");
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    draw.current = Math.max(
      0.25,
      Math.min(
        1,
        draw.current + (performance.now() - drawStart.current) / 1800,
      ),
    );
    arrow.current = launchArrow(angle.current, draw.current);
    followThrough.current = 0.65;
    setPhase("ARROW IN FLIGHT");
  };
  const timer = practiceOnly ? localTime : remainingSeconds;
  return (
    <main className="archery-game">
      <header>
        <div>
          <b>PRECISION ARCHERY</b>
          <span>VISUAL-MOTOR PRECISION &amp; CONTROL</span>
        </div>
        <div>
          <small>TIME REMAINING</small>
          <strong>
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
          </strong>
        </div>
      </header>
      <section>
        <canvas
          ref={canvasRef}
          width={900}
          height={560}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <div className="archery-phase">
          {phase}
          <span>Outdoor training range</span>
        </div>
        {!started && (
          <div className="archery-cover">
            <div>
              <span>SPORT ARCHERY</span>
              <h1>Aim. Draw. Release.</h1>
              <p>
                Drag anywhere on the range to aim the bow. Keep holding to draw
                the string, then release to shoot.
              </p>
              <button
                onClick={() => {
                  setStarted(true);
                  setPhase("ROUND 1 · LARGE TARGET · LIGHT WIND →");
                }}
              >
                ENTER RANGE
              </button>
            </div>
          </div>
        )}
        {started && showRoundTwo && (
          <div className="archery-cover">
            <div className="archery-round-card">
              <span>ROUND 1 COMPLETE</span>
              <h1>Round 2</h1>
              <p>
                The target is smaller and a stronger wind now flows from right
                to left.
              </p>
              <button
                onClick={() => {
                  setShowRoundTwo(false);
                  setPhase("ROUND 2 · STRONG WIND ← · AIM · DRAW · RELEASE");
                }}
              >
                START ROUND 2
              </button>
            </div>
          </div>
        )}
        {onBack && (
          <button className="archery-exit" onClick={onBack}>
            Exit
          </button>
        )}
      </section>
    </main>
  );
}
