"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { PuckEngine } from "./PuckEngine";
import { PaddleEngine } from "./PaddleEngine";
import { OpponentEngine } from "./OpponentEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { goalSide, paddleHit } from "./CollisionEngine";
import { scoreAirHockey } from "./ScoringEngine";
import type { AirHockeyMetrics, RallyEvent } from "./Types";
import "./AirHockeyChallengeGame.css";
type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (m: AirHockeyMetrics) => void | Promise<void>;
};
export default function AirHockeyChallengeGame({
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
    resetAt = useRef(0),
    puck = useRef(new PuckEngine()),
    child = useRef(new PaddleEngine()),
    opponent = useRef(new OpponentEngine()),
    difficulty = useRef(new DifficultyEngine()),
    events = useRef<RallyEvent[]>([]),
    goalsConceded = useRef(0),
    opponentGoals = useRef(0),
    adaptations = useRef(0),
    lastStage = useRef(1),
    unnecessary = useRef(0),
    premature = useRef(0),
    corrections = useRef(0);
  const [started, setStarted] = useState(false),
    [preview, setPreview] = useState(remainingSeconds ?? 120);
  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);
  const finish = useCallback((status = "COMPLETED") => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(raf.current);
    const elapsed = performance.now() - start.current,
      c = child.current.state,
      p = puck.current;
    void complete.current(
      scoreAirHockey(events.current, {
        sessionDuration: Math.round(elapsed / 1000),
        ralliesStarted: p.rallies,
        ralliesCompleted: goalsConceded.current + opponentGoals.current,
        goalsConceded: goalsConceded.current,
        opponentGoals: opponentGoals.current,
        paddleMovementDistance: Math.round(c.movementDistance),
        paddleDirectionChanges: c.directionChanges,
        unnecessaryMovements: unnecessary.current,
        prematureMovements: premature.current,
        correctiveMovements: corrections.current,
        adaptationEvents: adaptations.current,
        adaptationTime: 0,
        difficultyReached: difficulty.current.get(elapsed).stage,
        completionStatus: status,
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
      finishAt.current = performance.now() + 1200;
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
      finishAt.current = performance.now() + 1200;
    }
  }, [started, practiceOnly, preview]);
  useEffect(() => {
    if (!started || disabled || done.current) return;
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    start.current = performance.now();
    last.current = start.current;
    const resize = () => {
      const r = el.getBoundingClientRect(),
        s = Math.min(devicePixelRatio || 1, 2);
      el.width = r.width * s;
      el.height = r.height * s;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      child.current.reset(r.width, r.height);
      opponent.current.reset(r.width, r.height);
      puck.current.reset(r.width, r.height, difficulty.current.get(0), 1);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    let pointer: number | null = null;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      child.current.target(
        e.clientX - r.left,
        e.clientY - r.top,
        r.width,
        r.height,
      );
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      pointer = e.pointerId;
      el.setPointerCapture(e.pointerId);
      move(e);
    };
    const drag = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || pointer === e.pointerId) move(e);
    };
    const up = (e: PointerEvent) => {
      if (pointer === e.pointerId) {
        if (el.hasPointerCapture(e.pointerId))
          el.releasePointerCapture(e.pointerId);
        pointer = null;
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", drag);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const loop = (now: number) => {
      const r = el.getBoundingClientRect(),
        dt = Math.min(0.03, (now - last.current) / 1000);
      last.current = now;
      const elapsed = now - start.current,
        level = difficulty.current.get(elapsed);
      if (level.stage !== lastStage.current) {
        adaptations.current++;
        lastStage.current = level.stage;
      }
      child.current.update(dt, r.width, r.height);
      opponent.current.update(
        dt,
        now,
        puck.current.puck,
        level,
        r.width,
        r.height,
      );
      if (!resetAt.current) puck.current.update(dt, r.width);
      const livePuck = puck.current.puck;
      const inGoalLane =
        livePuck.x > r.width * 0.32 && livePuck.x < r.width * 0.68;
      if (!inGoalLane && livePuck.y - livePuck.radius <= 0 && livePuck.vy < 0) {
        livePuck.y = livePuck.radius;
        livePuck.vy *= -1;
      }
      if (
        !inGoalLane &&
        livePuck.y + livePuck.radius >= r.height &&
        livePuck.vy > 0
      ) {
        livePuck.y = r.height - livePuck.radius;
        livePuck.vy *= -1;
      }
      if (paddleHit(puck.current.puck, child.current.state)) {
        events.current.push({
          kind: "return",
          at: Math.round(elapsed),
          responseTime: Math.max(0, now - start.current),
          distance: Math.abs(puck.current.puck.x - child.current.state.x),
          stage: level.stage,
        });
        puck.current.normalize(level.puckSpeed);
      }
      if (paddleHit(puck.current.puck, opponent.current.state))
        puck.current.normalize(level.puckSpeed);
      const goal = goalSide(puck.current.puck, r.width, r.height);
      if (goal && !resetAt.current) {
        if (goal === "child") {
          goalsConceded.current++;
          events.current.push({
            kind: "miss",
            at: Math.round(elapsed),
            responseTime: 0,
            distance: Math.abs(puck.current.puck.x - child.current.state.x),
            stage: level.stage,
          });
        } else opponentGoals.current++;
        resetAt.current = now + 650;
        puck.current.puck.active = false;
      }
      if (resetAt.current && now >= resetAt.current && !ending.current) {
        resetAt.current = 0;
        puck.current.reset(
          r.width,
          r.height,
          level,
          Math.random() < 0.5 ? 1 : -1,
        );
      }
      ctx.clearRect(0, 0, r.width, r.height);
      const glow = (x: number, y: number, radius: number, color: string) => {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 22;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#eaffff";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      };
      glow(
        opponent.current.state.x,
        opponent.current.state.y,
        opponent.current.state.radius,
        "#ff5d74",
      );
      glow(
        child.current.state.x,
        child.current.state.y,
        child.current.state.radius,
        "#35dfbd",
      );
      if (puck.current.puck.active)
        glow(
          puck.current.puck.x,
          puck.current.puck.y,
          puck.current.puck.radius,
          "#17283c",
        );
      if (
        ending.current &&
        (!puck.current.puck.active || now >= finishAt.current)
      ) {
        finish();
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", drag);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      cancelAnimationFrame(raf.current);
    };
  }, [disabled, finish, started]);
  return (
    <div className="air-hockey">
      <div className="ah-table">
        <div className="ah-center" />
        <div className="ah-circle" />
        <div className="ah-goal top" />
        <div className="ah-goal bottom" />
        <canvas
          ref={canvas}
          aria-label="Air hockey table. Move the lower green paddle with pointer or touch."
        />
      </div>
      {!started && (
        <div className="ah-intro">
          <div>
            <span className="ah-demo red" />
            <i>●</i>
            <span className="ah-demo green" />
            <b>↔</b>
            <button
              onClick={() => setStarted(true)}
              aria-label="Start air hockey"
            >
              <Play fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
