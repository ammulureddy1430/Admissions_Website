"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  catcherWidth,
  chooseTarget,
  difficultyFor,
  intersects,
  moveCatcher,
  moveObject,
  spawnInterval,
  spawnObject,
  timedOut,
} from "./CatchTheTargetEngine";
import { scoreCatchGame } from "./ScoringEngine";
import type {
  CatchEvent,
  CatchMetrics,
  FallingObject,
  GardenSymbol,
} from "./Types";
import "./CatchTheTargetGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  durationSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: CatchMetrics) => void | Promise<void>;
};

const ASSESSMENT_SECONDS = 20;
const TOTAL_ROUNDS = 3;
const CATCHES_PER_ROUND = 3;

export default function CatchTheTargetGame({
  disabled = false,
  remainingSeconds,
  durationSeconds,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animation = useRef(0);
  const running = useRef(false);
  const finished = useRef(false);
  const objects = useRef<FallingObject[]>([]);
  const events = useRef<CatchEvent[]>([]);
  const catcherX = useRef(0);
  const lastCatcherX = useRef(0);
  const movement = useRef(0);
  const lastFrame = useRef(0);
  const lastSpawn = useRef(0);
  const nextId = useRef(1);
  const resolvedTargets = useRef(0);
  const correctCatchesRef = useRef(0);
  const round = useRef(0);
  const levelRef = useRef(1);
  const targetRef = useRef<GardenSymbol>(chooseTarget(0));
  const pauseUntil = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const [target, setTarget] = useState<GardenSymbol>(() => chooseTarget(0));
  const [correctCatches, setCorrectCatches] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const [assessmentSeconds, setAssessmentSeconds] = useState(() =>
    Math.min(
      remainingSeconds ?? durationSeconds ?? ASSESSMENT_SECONDS,
      ASSESSMENT_SECONDS,
    ),
  );
  const shownSeconds = Math.min(
    remainingSeconds ?? assessmentSeconds,
    assessmentSeconds,
  );

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const showFeedback = useCallback((value: "correct" | "wrong") => {
    setFeedback(value);
    if (feedbackTimer.current !== null)
      window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 650);
  }, []);

  useEffect(() => {
    if (disabled || finished.current) return;
    const timer = window.setInterval(
      () => setAssessmentSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [disabled]);

  const finish = useCallback((status: string) => {
    if (finished.current) return;
    finished.current = true;
    running.current = false;
    cancelAnimationFrame(animation.current);
    void onCompleteRef.current(
      scoreCatchGame(
        events.current,
        movement.current,
        levelRef.current,
        round.current,
        status,
      ),
    );
  }, []);

  useEffect(() => {
    if (disabled || finished.current || running.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    running.current = true;
    pauseUntil.current = performance.now() + 900;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
      catcherX.current = Math.min(
        catcherX.current || (rect.width - catcherWidth(levelRef.current)) / 2,
        rect.width - catcherWidth(levelRef.current),
      );
      lastCatcherX.current = catcherX.current;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (width: number, height: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff75";
      context.beginPath();
      context.ellipse(width * 0.18, height * 0.2, 90, 30, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffffff62";
      context.beginPath();
      context.ellipse(width * 0.78, height * 0.31, 120, 36, 0, 0, Math.PI * 2);
      context.fill();
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const object of objects.current) {
        context.save();
        context.translate(object.x, object.y);
        context.fillStyle = "#fffdf0d9";
        context.beginPath();
        context.arc(0, 0, object.size * 0.53, 0, Math.PI * 2);
        context.fill();
        context.font = `900 ${object.size}px system-ui`;
        context.fillStyle = "#7c6aa6";
        context.fillText(object.symbol, 0, 2);
        context.restore();
      }
      const basketW = catcherWidth(levelRef.current);
      const basketY = height - 74;
      context.save();
      context.translate(catcherX.current, basketY);
      context.fillStyle = "#9a603b";
      context.beginPath();
      context.roundRect(0, 16, basketW, 42, [10, 10, 24, 24]);
      context.fill();
      context.strokeStyle = "#f5c274";
      context.lineWidth = 7;
      context.beginPath();
      context.arc(basketW / 2, 18, basketW * 0.3, Math.PI, 0);
      context.stroke();
      context.strokeStyle = "#d99455";
      context.lineWidth = 3;
      for (let x = 18; x < basketW; x += 22) {
        context.beginPath();
        context.moveTo(x, 20);
        context.lineTo(x - 5, 53);
        context.stroke();
      }
      context.restore();
    };

    const frame = (now: number) => {
      if (!running.current) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const delta = Math.min(
        0.034,
        lastFrame.current ? (now - lastFrame.current) / 1000 : 0,
      );
      lastFrame.current = now;
      const basketW = catcherWidth(levelRef.current);
      const basketY = height - 74;
      if (
        now >= pauseUntil.current &&
        now - lastSpawn.current >= spawnInterval(levelRef.current)
      ) {
        objects.current.push(
          spawnObject(
            nextId.current++,
            levelRef.current,
            targetRef.current,
            width,
            now,
          ),
        );
        lastSpawn.current = now;
      }
      const remaining: FallingObject[] = [];
      let advancedRound = false;
      for (const original of objects.current) {
        const object = moveObject(original, delta * Math.max(1, height / 720));
        if (object.enteredCatchZoneAt === null && object.y >= height * 0.62)
          object.enteredCatchZoneAt = now;
        const caught = intersects(
          object,
          catcherX.current,
          basketY,
          basketW,
          58,
        );
        const missed = object.y - object.size / 2 > height;
        if (caught || missed) {
          const horizontalDistance = Math.abs(
            object.x - (catcherX.current + basketW / 2),
          );
          events.current.push({
            target: object.target,
            caught,
            timestamp: now,
            objectX: object.x,
            catcherX: catcherX.current,
            horizontalDistance,
            difficulty: levelRef.current,
            speed: object.speed,
            symbol: object.symbol,
            responseTime: object.enteredCatchZoneAt
              ? Math.round(now - object.enteredCatchZoneAt)
              : 0,
          });
          if (caught && !object.target) showFeedback("wrong");
          if (object.target) {
            resolvedTargets.current += 1;
            levelRef.current = difficultyFor(resolvedTargets.current);
            if (caught) {
              correctCatchesRef.current += 1;
              setCorrectCatches(correctCatchesRef.current);
              showFeedback("correct");
              if (correctCatchesRef.current >= CATCHES_PER_ROUND) {
                round.current += 1;
                setCompletedRounds(round.current);
                if (round.current >= TOTAL_ROUNDS) {
                  draw(width, height);
                  finish("COMPLETED");
                  return;
                }
                correctCatchesRef.current = 0;
                setCorrectCatches(0);
                setAssessmentSeconds(ASSESSMENT_SECONDS);
                targetRef.current = chooseTarget(round.current);
                setTarget(targetRef.current);
                pauseUntil.current = now + 600;
                advancedRound = true;
                break;
              }
            }
          }
        } else remaining.push(object);
      }
      objects.current = advancedRound ? [] : remaining;
      draw(width, height);
      animation.current = requestAnimationFrame(frame);
    };
    animation.current = requestAnimationFrame(frame);
    return () => {
      running.current = false;
      cancelAnimationFrame(animation.current);
      observer.disconnect();
      if (feedbackTimer.current !== null)
        window.clearTimeout(feedbackTimer.current);
      lastFrame.current = 0;
    };
  }, [disabled, finish, showFeedback]);

  useEffect(() => {
    if (timedOut(shownSeconds)) finish("TIME_LIMIT_REACHED");
  }, [finish, shownSeconds]);

  const move = (clientX: number) => {
    if (disabled || finished.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const next = moveCatcher(
      clientX - rect.left,
      rect.width,
      catcherWidth(levelRef.current),
    );
    movement.current += Math.abs(next - lastCatcherX.current);
    lastCatcherX.current = next;
    catcherX.current = next;
  };

  const minutes = Math.floor((shownSeconds ?? 0) / 60);
  const seconds = (shownSeconds ?? 0) % 60;

  return (
    <div className="catch-target-game">
      {shownSeconds !== undefined && (
        <div
          className="catch-target-game__timer"
          aria-label={`${shownSeconds} seconds remaining`}
        >
          <span>TIME</span>
          <b>
            {minutes}:{String(seconds).padStart(2, "0")}
          </b>
        </div>
      )}
      <div
        className="catch-target-game__score"
        aria-label={`Round ${Math.min(completedRounds + 1, TOTAL_ROUNDS)} of ${TOTAL_ROUNDS}; ${correctCatches} of ${CATCHES_PER_ROUND} matching shapes collected`}
      >
        <span>
          ROUND {Math.min(completedRounds + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
        </span>
        <small>COLLECTED</small>
        <b>
          {correctCatches} / {CATCHES_PER_ROUND}
        </b>
      </div>
      {feedback && (
        <div
          className={`catch-target-game__feedback catch-target-game__feedback--${feedback}`}
          role="status"
        >
          {feedback === "correct" ? "✓ Correct catch!" : "✕ Wrong shape"}
        </div>
      )}
      <div
        className="catch-target-game__target"
        aria-label={`Catch the ${target} shape`}
      >
        <span>COLLECT {CATCHES_PER_ROUND}</span>
        <b>{target}</b>
      </div>
      <div className="catch-target-game__help" aria-hidden>
        <span>↔</span> CATCH ONLY THE MATCHING SHAPE
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX);
        }}
        onPointerMove={(event) => {
          move(event.clientX);
        }}
        onKeyDown={(event) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          if (event.key === "ArrowLeft")
            move(rect.left + catcherX.current - 24);
          if (event.key === "ArrowRight")
            move(
              rect.left +
                catcherX.current +
                catcherWidth(levelRef.current) +
                24,
            );
        }}
        aria-label="Magic garden catching area. Drag or use arrow keys to move the basket."
      />
      <div className="catch-target-game__ground" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
