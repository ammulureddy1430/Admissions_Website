"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { COURSES } from "./Levels";
import { shotVelocity, stepBall } from "./PhysicsEngine";
import { scoreGolf } from "./ScoringEngine";
import type { Ball, MiniGolfMetrics } from "./Types";
import "./MiniGolfGame.css";
type P = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (m: MiniGolfMetrics) => void | Promise<void>;
};
const base: Record<string, number> = {
  coursesStarted: 1,
  coursesCompleted: 0,
  shotsTaken: 0,
  holesCompleted: 0,
  ballsStopped: 0,
  initialShotAngle: 0,
  initialShotPower: 0,
  angleAdjustments: 0,
  powerAdjustments: 0,
  directionAdjustments: 0,
  successfulShots: 0,
  unsuccessfulShots: 0,
  overshootCount: 0,
  undershootCount: 0,
  wallCollisionCount: 0,
  obstacleCollisionCount: 0,
  bounceShots: 0,
  movingObstacleShots: 0,
  successfulBounceShots: 0,
  adaptiveAdjustments: 0,
  successfulAdaptiveAdjustments: 0,
  ballTravelDistance: 0,
  targetDistance: 0,
  trajectoryDeviation: 0,
  angleDeviation: 0,
  powerDeviation: 0,
  shotConsistency: 0,
  courseDifficulty: 1,
  highestDifficulty: 1,
  beginningPerformance: 0,
  middlePerformance: 0,
  endingPerformance: 0,
};
export default function MiniGolfGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: P) {
  const board = useRef<SVGSVGElement>(null),
    ball = useRef<Ball>({ x: 18, y: 70, vx: 0, vy: 0, r: 1.65, moving: false }),
    raf = useRef(0),
    last = useRef(0),
    started = useRef(Date.now()),
    shotStart = useRef(Date.now()),
    drag = useRef<{ x: number; y: number } | null>(null),
    metrics = useRef({ ...base }),
    times = useRef<number[]>([]),
    shots = useRef<number[]>([0]),
    courseRef = useRef(0),
    done = useRef(false),
    lastShot = useRef<{ angle: number; power: number } | undefined>(undefined);
  const [, paint] = useState(0),
    [courseIndex, setCourseIndex] = useState(0),
    [aim, setAim] = useState<{ x: number; y: number } | null>(null),
    [preview, setPreview] = useState(remainingSeconds ?? 120);
  const course = COURSES[courseIndex],
    seconds = practiceOnly ? preview : (remainingSeconds ?? 120),
    clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const reset = useCallback((i: number) => {
    const c = COURSES[i];
    Object.assign(ball.current, { ...c.start, vx: 0, vy: 0, moving: false });
    shotStart.current = Date.now();
    paint((v) => v + 1);
  }, []);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(raf.current);
    void onComplete(
      scoreGolf(
        metrics.current,
        times.current,
        shots.current,
        Math.min(120, (Date.now() - started.current) / 1000),
      ),
    );
  }, [onComplete]);
  useEffect(() => {
    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - (last.current || now)) / 1000);
      last.current = now;
      const b = ball.current,
        c = COURSES[courseRef.current];
      if (b.moving) {
        const beforeX = b.x,
          beforeY = b.y;
        const moving = c.moving
          ? { ...c.moving, y: c.moving.y + Math.sin(now / 850) * 10 }
          : undefined;
        const r = stepBall(b, c, dt, 160, 90, moving);
        metrics.current.ballTravelDistance += Math.hypot(
          b.x - beforeX,
          b.y - beforeY,
        );
        metrics.current.wallCollisionCount += r.walls;
        metrics.current.obstacleCollisionCount += r.obstacles;
        if (r.hole) {
          b.moving = false;
          metrics.current.coursesCompleted++;
          metrics.current.holesCompleted++;
          metrics.current.successfulShots++;
          if (metrics.current.wallCollisionCount)
            metrics.current.successfulBounceShots++;
          if (courseRef.current === COURSES.length - 1) {
            window.setTimeout(finish, 500);
            return;
          }
          const next = Math.min(COURSES.length - 1, courseRef.current + 1);
          const changedRound = next !== courseRef.current;
          courseRef.current = next;
          setCourseIndex(next);
          if (changedRound) metrics.current.coursesStarted = 2;
          metrics.current.highestDifficulty = Math.max(
            metrics.current.highestDifficulty,
            COURSES[next].difficulty,
          );
          if (changedRound) shots.current.push(0);
          window.setTimeout(() => reset(next), 500);
        } else if (r.stopped) {
          metrics.current.ballsStopped++;
          metrics.current.unsuccessfulShots++;
          const d = Math.hypot(b.x - c.hole.x, b.y - c.hole.y);
          if (d < 12) metrics.current.undershootCount++;
          else metrics.current.overshootCount++;
          shotStart.current = Date.now();
        }
      }
      paint((v) => v + 1);
      if (!done.current) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [finish, reset]);
  useEffect(() => {
    if (practiceOnly) {
      const id = setInterval(() => setPreview((v) => Math.max(0, v - 1)), 1000);
      return () => clearInterval(id);
    }
  }, [practiceOnly]);
  useEffect(() => {
    if (seconds <= 0) finish();
  }, [finish, seconds]);
  const point = (e: React.PointerEvent) => {
    const r = board.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 160,
      y: ((e.clientY - r.top) / r.height) * 90,
    };
  };
  const down = (e: React.PointerEvent) => {
    if (disabled || ball.current.moving || done.current) return;
    const p = point(e);
    if (Math.hypot(p.x - ball.current.x, p.y - ball.current.y) > 7) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = p;
    setAim(p);
  };
  const move = (e: React.PointerEvent) => {
    if (drag.current) setAim(point(e));
  };
  const up = (e: React.PointerEvent) => {
    if (!drag.current || !aim) return;
    const s = shotVelocity(ball.current.x, ball.current.y, aim.x, aim.y);
    if (s.power < 3) {
      drag.current = null;
      setAim(null);
      return;
    }
    ball.current.vx = s.vx;
    ball.current.vy = s.vy;
    ball.current.moving = true;
    metrics.current.shotsTaken++;
    shots.current[shots.current.length - 1]++;
    times.current.push(Date.now() - shotStart.current);
    if (!lastShot.current) {
      metrics.current.initialShotAngle = s.angle;
      metrics.current.initialShotPower = s.power;
    } else {
      metrics.current.angleAdjustments +=
        Math.abs(s.angle - lastShot.current.angle) > 0.12 ? 1 : 0;
      metrics.current.powerAdjustments +=
        Math.abs(s.power - lastShot.current.power) > 5 ? 1 : 0;
      metrics.current.adaptiveAdjustments++;
    }
    lastShot.current = s;
    drag.current = null;
    setAim(null);
  };
  return (
    <div className="mg-game">
      <header>
        <div>
          <small>PUTTING PARK</small>
          <h2>⛳ Mini Golf Challenge</h2>
        </div>
        <div className="mg-round">
          <span>ROUND {courseIndex + 1} / 2</span>
          <b>{course.name}</b>
        </div>
        <time>{clock}</time>
      </header>
      <svg
        ref={board}
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <defs>
          <pattern
            id="grass"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="8" fill="#54ad68" />
            <path
              d="M0 8L8 0M-3 3L3-3M5 11L11 5"
              stroke="#67bc78"
              strokeWidth=".5"
            />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity=".3" />
          </filter>
          <radialGradient id="rock" cx="35%" cy="28%">
            <stop offset="0" stopColor="#d8e1d8" />
            <stop offset=".55" stopColor="#879a8d" />
            <stop offset="1" stopColor="#53675d" />
          </radialGradient>
          <linearGradient id="sand" x2="0" y2="1">
            <stop stopColor="#f4dfa1" />
            <stop offset="1" stopColor="#d9b96c" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="156"
          height="86"
          rx="7"
          fill="url(#grass)"
          stroke="#e8d6a1"
          strokeWidth="3"
        />
        {course.sand && (
          <rect
            x={course.sand.x}
            y={course.sand.y}
            width={course.sand.w}
            height={course.sand.h}
            rx="5"
            fill="url(#sand)"
            stroke="#c69f53"
            strokeWidth=".6"
          />
        )}
        {course.water && (
          <rect
            x={course.water.x}
            y={course.water.y}
            width={course.water.w}
            height={course.water.h}
            rx="4"
            fill="#55bad1"
          />
        )}
        {course.walls.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            rx="1"
            fill="#f4ead2"
            stroke="#aa8c5d"
            strokeWidth=".7"
            filter="url(#shadow)"
          />
        ))}
        {course.bumpers.map((b, i) => (
          <g key={i} className="mg-rock" filter="url(#shadow)">
            <circle
              cx={b.x}
              cy={b.y}
              r={b.r}
              fill="url(#rock)"
              stroke="#43574c"
              strokeWidth=".7"
            />
            <ellipse
              cx={b.x - b.r * 0.28}
              cy={b.y - b.r * 0.34}
              rx={b.r * 0.25}
              ry={b.r * 0.14}
              fill="#f3f6ef"
              opacity=".55"
            />
          </g>
        ))}
        <g className="mg-flowers" aria-hidden="true">
          {[
            [10, 12, "#ffe06a"],
            [15, 9, "#f58fa6"],
            [149, 73, "#f5b7d1"],
            [153, 68, "#ffe06a"],
          ].map(([x, y, color], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle cy="-1.1" r=".75" fill={String(color)} />
              <circle cx="1.1" r=".75" fill={String(color)} />
              <circle cy="1.1" r=".75" fill={String(color)} />
              <circle cx="-1.1" r=".75" fill={String(color)} />
              <circle r=".55" fill="#fff2a6" />
            </g>
          ))}
        </g>
        {course.moving && (
          <rect
            x={course.moving.x}
            width={course.moving.w}
            height={course.moving.h}
            y={course.moving.y + Math.sin(performance.now() / 850) * 10}
            rx="2"
            fill="#7956c7"
            stroke="#fff"
          />
        )}
        <circle
          cx={course.hole.x}
          cy={course.hole.y}
          r={course.hole.r}
          fill="#173b38"
        />
        <path
          d={`M${course.hole.x} ${course.hole.y}v-13`}
          stroke="#fff"
          strokeWidth=".8"
        />
        <path
          d={`M${course.hole.x} ${course.hole.y - 13}l8 3-8 3z`}
          fill="#ffdb58"
        />
        {aim && (
          <g>
            <line
              x1={ball.current.x}
              y1={ball.current.y}
              x2={ball.current.x + (ball.current.x - aim.x)}
              y2={ball.current.y + (ball.current.y - aim.y)}
              stroke="#fff"
              strokeWidth=".8"
              strokeDasharray="2 2"
            />
            <circle cx={aim.x} cy={aim.y} r="1" fill="#fff8" />
          </g>
        )}
        {ball.current.moving && (
          <line
            className="mg-motion"
            x1={ball.current.x}
            y1={ball.current.y}
            x2={ball.current.x - ball.current.vx * 0.06}
            y2={ball.current.y - ball.current.vy * 0.06}
          />
        )}
        <circle
          cx={ball.current.x}
          cy={ball.current.y}
          r={ball.current.r}
          fill="#fff"
          stroke="#dce5e3"
          strokeWidth=".6"
          filter="url(#shadow)"
        />
        <circle
          cx={ball.current.x - 0.45}
          cy={ball.current.y - 0.45}
          r=".25"
          fill="#d5dddc"
        />
      </svg>
      <footer>
        <span>Press the ball</span>
        <i>•</i>
        <span>Pull to aim</span>
        <i>•</i>
        <span>Release to putt</span>
      </footer>
    </div>
  );
}
