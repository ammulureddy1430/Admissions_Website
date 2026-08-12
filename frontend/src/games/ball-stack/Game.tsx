"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Hand, Play, Timer } from "lucide-react";
import { BallStackAnalyticsService } from "./AnalyticsService";
import { burstParticles } from "./AnimationController";
import { BALL_RADIUS, BALL_STACK_DURATION_SECONDS, BallStackEngine } from "./GameEngine";
import { BallStackPhysicsEngine } from "./PhysicsEngine";
import { scoreBallStack } from "./ScoringEngine";
import { BallStackSoundManager } from "./Sounds/SoundManager";
import type { BallStackScores, BallState, RawBallStackMetrics } from "./Types";
import { Ball } from "./UI/Ball";
import { Platform } from "./UI/Platform";
import "./Styles/Game.css";

type Particle = ReturnType<typeof burstParticles>[number];
const TOWER_TARGET = 8;
const TOTAL_ROUNDS = 2;
export default function BallStackGame({ disabled = false, sound = true, durationSeconds = BALL_STACK_DURATION_SECONDS, maxRounds = TOTAL_ROUNDS, onComplete }: { disabled?: boolean; sound?: boolean; durationSeconds?: number; maxRounds?: number; onComplete: (metrics: BallStackScores) => void | Promise<void> }) {
  const world = useRef<HTMLDivElement>(null); const animation = useRef(0); const movingStartedAt = useRef(0);
  const [engine] = useState(() => new BallStackEngine()); const [physics] = useState(() => new BallStackPhysicsEngine());
  const sounds = useRef<BallStackSoundManager | null>(null); const analytics = useRef(new BallStackAnalyticsService(onComplete));
  const raw = useRef<RawBallStackMetrics>({ totalBallsDropped: 0, successfulPlacements: 0, failedPlacements: 0, highestTowerHeight: 0, alignmentPercentages: [], perfectPlacements: 0, reactionTimes: [], stabilityPercentages: [], elapsedSeconds: 0, endReason: "TIME_LIMIT_REACHED" }); const finished = useRef(false); const [complete, setComplete] = useState(false); const xRef = useRef(BALL_RADIUS);
  const [stable, setStable] = useState<BallState[]>([]); const stableRef = useRef<BallState[]>([]);
  const [moving, setMoving] = useState<BallState>({ id: 1, x: BALL_RADIUS, y: 110, radius: BALL_RADIUS, color: "coral", stable: false, falling: false });
  const [falling, setFalling] = useState<BallState | null>(null); const [particles, setParticles] = useState<Particle[]>([]);
  const [seconds, setSeconds] = useState(durationSeconds);
  const [started, setStarted] = useState(false); const [transitioning, setTransitioning] = useState(false); const [round, setRound] = useState(1);
  useEffect(() => { movingStartedAt.current = performance.now(); sounds.current = new BallStackSoundManager(sound); return () => { cancelAnimationFrame(animation.current); sounds.current?.dispose(); }; }, [sound]);
  useEffect(() => sounds.current?.setEnabled(sound), [sound]);
  useEffect(() => { analytics.current = new BallStackAnalyticsService(onComplete); }, [onComplete]);

  const finish = useCallback(async (reason: RawGameMetricsEnd) => {
    if (finished.current) return; finished.current = true; setComplete(true); cancelAnimationFrame(animation.current);
    raw.current.elapsedSeconds = durationSeconds - seconds; raw.current.endReason = reason;
    await analytics.current.save(scoreBallStack(raw.current));
  }, [durationSeconds, seconds]);
  type RawGameMetricsEnd = RawBallStackMetrics["endReason"];

  useEffect(() => {
    if (disabled || !started || transitioning || finished.current) return;
    const tick = (now: number) => {
      const width = world.current?.clientWidth || 800; const level = stableRef.current.length;
      const x = physics.horizontalPosition(movingStartedAt.current, now, width, BALL_RADIUS, engine.speedFor(level));
      xRef.current = x; setMoving((ball) => ({ ...ball, x, y: Math.max(92, (world.current?.clientHeight || 600) - 126 - level * BALL_RADIUS * 1.72) }));
      animation.current = requestAnimationFrame(tick);
    };
    animation.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(animation.current);
  }, [disabled, engine, physics, started, transitioning]);
  useEffect(() => { if (disabled || !started || finished.current) return; const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(timer); }, [disabled, started]);
  useEffect(() => { if (seconds === 0) void finish("TIME_LIMIT_REACHED"); }, [seconds, finish]);

  const drop = () => {
    if (disabled || !started || transitioning || finished.current || falling) return;
    const height = world.current?.clientHeight || 600; const supportX = stableRef.current.at(-1)?.x ?? (world.current?.clientWidth || 800) / 2;
    const result = physics.evaluateLanding(xRef.current, supportX, BALL_RADIUS); const reaction = performance.now() - movingStartedAt.current;
    raw.current.totalBallsDropped += 1; raw.current.reactionTimes.push(reaction); raw.current.alignmentPercentages.push(result.alignment);
    if (!result.success) {
      raw.current.failedPlacements += 1; sounds.current?.playFall(); setFalling({ ...moving, x: xRef.current, falling: true });
      window.setTimeout(() => setFalling(null), 650); movingStartedAt.current = performance.now(); setMoving((ball) => ({ ...ball, id: engine.nextId(), color: engine.nextColor() })); return;
    }
    raw.current.successfulPlacements += 1; raw.current.stabilityPercentages.push(result.stability); if (result.perfect) raw.current.perfectPlacements += 1;
    const placed = { ...moving, x: xRef.current, y: height - 90 - stableRef.current.length * BALL_RADIUS * 1.72, stable: true };
    const nextStable = [...stableRef.current, placed]; stableRef.current = nextStable; setStable(nextStable); raw.current.highestTowerHeight = Math.max(raw.current.highestTowerHeight, nextStable.length);
    sounds.current?.playLand(result.perfect); const burst = burstParticles(placed.x, placed.y, `var(--ball-${placed.color})`); setParticles(burst); window.setTimeout(() => setParticles([]), 620);
    const averageStability = raw.current.stabilityPercentages.reduce((sum, value) => sum + value, 0) / raw.current.stabilityPercentages.length;
    if (nextStable.length >= 3 && averageStability < 25) { setStable([]); stableRef.current = []; void finish("TOWER_COLLAPSED"); return; }
    if (nextStable.length >= TOWER_TARGET) {
      setTransitioning(true);
      if (round >= maxRounds) { window.setTimeout(() => void finish("ROUNDS_COMPLETED"), 900); return; }
      window.setTimeout(() => { stableRef.current = []; setStable([]); setRound((value) => value + 1); movingStartedAt.current = performance.now(); setMoving({ id: engine.nextId(), x: BALL_RADIUS, y: 100, radius: BALL_RADIUS, color: engine.nextColor(), stable: false, falling: false }); setTransitioning(false); }, 1100);
      return;
    }
    movingStartedAt.current = performance.now(); setMoving({ id: engine.nextId(), x: BALL_RADIUS, y: 100, radius: BALL_RADIUS, color: engine.nextColor(), stable: false, falling: false });
  };
  const progress = (durationSeconds - seconds) / durationSeconds * 100;
  const begin = () => { movingStartedAt.current = performance.now(); setStarted(true); };
  return <div ref={world} className="ball-stack-world" onPointerDown={drop} role="application" aria-label="Ball Stack cognitive assessment">
    <div className="ball-stack-stage" aria-hidden><i /><i /></div>
    <div className="ball-stack-progress"><span style={{ width: `${progress}%` }} /></div>
    <div className="ball-stack-timer"><Timer /><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div>
    <div className="ball-stack-title"><span>FOCUS • AIM • TAP</span><h1>Ball Stack</h1></div>
    {started && <div className="ball-stack-goal"><small>ROUND {round} OF {TOTAL_ROUNDS} · BALLS</small><strong>{stable.length} <i>/</i> {TOWER_TARGET}</strong><div>{Array.from({ length: TOWER_TARGET }, (_, index) => <span key={index} className={index < stable.length ? "is-filled" : ""} />)}</div></div>}
    {started && <div className="ball-stack-action-strip"><span>1. Watch</span><b>→</b><span>2. Tap</span><b>→</b><span>3. Stack {TOWER_TARGET}</span></div>}
    {started && !transitioning && <div className="ball-stack-center-tip" aria-live="polite"><Crosshair /><div><strong>Tap exactly at the center</strong><span>when the moving ball is directly above the tower</span></div></div>}
    {started && !transitioning && <div className="ball-stack-aim-guide" style={{ left: stable.at(-1)?.x ?? "50%" }}><i /></div>}
    {stable.map((ball) => <Ball key={ball.id} ball={ball} />)}{!complete && !transitioning && <Ball ball={moving} />}{falling && <Ball ball={falling} />}
    {particles.map((particle) => <i key={particle.id} className="ball-stack-particle" style={{ left: particle.x, top: particle.y, background: particle.color, "--angle": `${particle.angle}deg`, "--distance": `${particle.distance}px` } as React.CSSProperties} />)}
    <Platform /><div className="ball-stack-horizon" />
    {transitioning && <div className="ball-stack-tower-complete"><strong>{round >= TOTAL_ROUNDS ? "Both towers complete!" : "Tower complete!"}</strong><span>{round >= TOTAL_ROUNDS ? "Assessment complete" : "Starting round 2…"}</span></div>}
    {!started && <div className="ball-stack-intro" onPointerDown={(event) => event.stopPropagation()}>
      <div className="ball-stack-intro-card">
        <div className="ball-stack-intro-mark" aria-hidden><i/><i/><i/></div>
        <p>1½ MINUTES · 2 ROUNDS</p><h2>Build two towers!</h2><span className="ball-stack-intro-copy">Watch the moving ball and choose the best moment to place it.</span>
        <div className="ball-stack-steps">
          <div><span className="intro-moving-ball" /><b>1</b><strong>Watch the ball move</strong></div>
          <div><span className="intro-aim"><i /><i /></span><b>2</b><strong>Wait above the tower</strong></div>
          <div><Hand /><b>3</b><strong>Tap anywhere to drop</strong></div>
        </div>
        <button type="button" onClick={begin}><Play /> Start stacking</button>
        <small>The timer starts after you press Start</small>
      </div>
    </div>}
  </div>;
}
