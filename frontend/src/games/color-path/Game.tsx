"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Volume2 } from "lucide-react";
import { ColorPathAnalyticsService } from "./AnalyticsService";
import { COLOR_PATH_DURATION_SECONDS, COLOR_PATH_TOTAL_ROUNDS, ColorPathEngine } from "./GameEngine";
import { COLOR_LABELS } from "./PathGenerator";
import { scoreColorPath } from "./ScoringEngine";
import { ColorPathSoundManager } from "./Sounds/SoundManager";
import type { ColorPathScores, PathStone } from "./Types";
import "./Styles/Game.css";

export default function ColorPathGame({ disabled = false, sound = true, durationSeconds = COLOR_PATH_DURATION_SECONDS, onComplete }: { disabled?: boolean; sound?: boolean; durationSeconds?: number; onComplete: (metrics: ColorPathScores) => void | Promise<void> }) {
  const [engine] = useState(() => new ColorPathEngine()); const [round, setRound] = useState(() => engine.current());
  const [seconds, setSeconds] = useState(durationSeconds); const [movingTo, setMovingTo] = useState<PathStone | null>(null); const [locked, setLocked] = useState(false);
  const metrics = useRef(engine.emptyMetrics()); const startedAt = useRef(0); const finished = useRef(false); const sounds = useRef<ColorPathSoundManager | null>(null); const analytics = useRef(new ColorPathAnalyticsService(onComplete));
  useEffect(() => { startedAt.current = performance.now(); sounds.current = new ColorPathSoundManager(sound); return () => sounds.current?.dispose(); }, [sound]);
  useEffect(() => sounds.current?.setEnabled(sound), [sound]); useEffect(() => { analytics.current = new ColorPathAnalyticsService(onComplete); }, [onComplete]);
  useEffect(() => {
    if (disabled || !sound) return;
    const announce = window.setTimeout(() => sounds.current?.speakColor(COLOR_LABELS[round.target]), 220);
    return () => window.clearTimeout(announce);
  }, [disabled, round.id, round.target, sound]);
  const finish = useCallback(async (reason: "TIME_LIMIT_REACHED" | "ROUNDS_COMPLETED") => { if (finished.current) return; finished.current = true; metrics.current.endReason = reason; metrics.current.elapsedSeconds = durationSeconds - seconds; await analytics.current.save(scoreColorPath(metrics.current)); }, [durationSeconds, seconds]);
  useEffect(() => { if (disabled || finished.current) return; const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => clearInterval(timer); }, [disabled]);
  useEffect(() => { if (seconds === 0) void finish("TIME_LIMIT_REACHED"); }, [seconds, finish]);
  const select = (stone: PathStone, eventTime: number) => {
    if (disabled || locked || finished.current) return; setLocked(true);
    const responseTime = eventTime - startedAt.current; const correct = engine.isCorrect(round, stone);
    metrics.current.roundsPlayed += 1; metrics.current.responseTimes.push(responseTime); metrics.current.highestDifficulty = Math.max(metrics.current.highestDifficulty, round.difficulty);
    if (correct) { metrics.current.correctSelections += 1; setMovingTo(stone); sounds.current?.playStep(); } else metrics.current.incorrectSelections += 1;
    const delay = correct ? 560 : 320;
    window.setTimeout(() => {
      if (metrics.current.roundsPlayed >= COLOR_PATH_TOTAL_ROUNDS) { void finish("ROUNDS_COMPLETED"); return; }
      setRound(engine.next()); setMovingTo(null); setLocked(false); startedAt.current = eventTime + delay;
    }, delay);
  };
  const progress = (durationSeconds - seconds) / durationSeconds * 100;
  return <div className="color-path-world" role="application" aria-label="Color Path visual recognition assessment">
    <div className="color-path-sky"><i /><i /><i /></div><div className="color-path-progress"><span style={{ width: `${progress}%` }} /></div>
    <div className="color-path-target"><small>TARGET COLOR</small><strong><i style={{ background: round.targetFill }} />{COLOR_LABELS[round.target]}<button type="button" onClick={() => sounds.current?.speakColor(COLOR_LABELS[round.target])} aria-label={`Hear ${COLOR_LABELS[round.target]} again`}><Volume2 /></button></strong></div>
    <div className="color-path-timer"><Timer /><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div>
    <div className="color-path-level" aria-label={`Round ${round.id} of ${COLOR_PATH_TOTAL_ROUNDS}`}>{Array.from({ length: COLOR_PATH_TOTAL_ROUNDS }, (_, index) => index + 1).map(level => <i key={level} className={level <= round.id ? "active" : ""} />)}</div>
    <div className={`color-path-character ${movingTo ? "is-jumping" : ""}`} style={movingTo ? { left: `${movingTo.x}%`, top: `${movingTo.y - 12}%` } : undefined} aria-hidden><span className="cp-ear left"/><span className="cp-ear right"/><span className="cp-face"><i/><i/><b/></span><span className="cp-body"/></div>
    <div className="color-path-hills" aria-hidden><i/><i/><i/></div>
    <svg key={`trail-${round.id}`} className="color-path-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><polyline points={`5,64 ${[...round.stones].sort((a, b) => a.x - b.x).map(stone => `${stone.x},${stone.y}`).join(" ")}`} /></svg>
    <div key={round.id} className="color-path-stones" aria-label="Color stepping stones">{round.stones.map((stone, index) => <button type="button" key={stone.id} disabled={disabled || locked} onClick={(event) => select(stone, event.timeStamp)} aria-label={`${COLOR_LABELS[stone.color]} stepping stone`} style={{ left: `${stone.x}%`, top: `${stone.y}%`, background: stone.fill, "--delay": `${index * 55}ms` } as React.CSSProperties} className={`color-path-stone ${movingTo?.id === stone.id ? "is-selected" : ""}`}><span /></button>)}</div>
    <div className="color-path-ground"><i/><i/><i/><i/><i/></div>
  </div>;
}
