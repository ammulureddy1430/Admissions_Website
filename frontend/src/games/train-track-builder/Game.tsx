"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Timer, TrainFront } from "lucide-react";
import { TrainTrackAnalyticsService } from "./AnalyticsService";
import { trainPosition } from "./AnimationController";
import { TRAIN_TRACK_DURATION_SECONDS, TrainTrackEngine } from "./GameEngine";
import { TrainPhysicsController } from "./PhysicsController";
import { scoreTrainTrack } from "./ScoringEngine";
import { TrainSoundManager } from "./SoundManager";
import type { TrackPiece, TrainTrackScores } from "./Types";
import "./Game.css";

const TOTAL_ROUNDS = 4;
type Feedback = "building" | "ready" | "running" | "success" | "blocked";

export default function TrainTrackBuilderGame({ disabled = false, sound = true, durationSeconds = TRAIN_TRACK_DURATION_SECONDS, maxRounds = TOTAL_ROUNDS, onComplete }: { disabled?: boolean; sound?: boolean; durationSeconds?: number; maxRounds?: number; onComplete: (metrics: TrainTrackScores) => void | Promise<void> }) {
  const [engine] = useState(() => new TrainTrackEngine());
  const [physics] = useState(() => new TrainPhysicsController());
  const [puzzle, setPuzzle] = useState(() => engine.current());
  const [pieces, setPieces] = useState(puzzle.pieces);
  const [seconds, setSeconds] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const [trainIndex, setTrainIndex] = useState(-1);
  const [confetti, setConfetti] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("building");
  const metrics = useRef(engine.emptyMetrics());
  const startedAt = useRef(0);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  const analytics = useRef(new TrainTrackAnalyticsService(onComplete));
  const sounds = useRef<TrainSoundManager | null>(null);
  const connected = useMemo(() => engine.connected(pieces), [engine, pieces]);

  useEffect(() => {
    const scheduledTimers = timers.current;
    startedAt.current = performance.now();
    sounds.current = new TrainSoundManager(true);
    return () => { scheduledTimers.forEach(window.clearTimeout); sounds.current?.dispose(); };
  }, []);
  useEffect(() => sounds.current?.setEnabled(sound), [sound]);
  useEffect(() => { analytics.current = new TrainTrackAnalyticsService(onComplete); }, [onComplete]);
  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    metrics.current.elapsedSeconds = durationSeconds - seconds;
    await analytics.current.save(scoreTrainTrack(metrics.current));
  }, [durationSeconds, seconds]);
  useEffect(() => {
    if (disabled || finished.current) return;
    const id = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [disabled]);
  useEffect(() => { if (seconds === 0) void finish(); }, [seconds, finish]);

  const rotate = (piece: TrackPiece) => {
    if (disabled || running || finished.current) return;
    const next = engine.rotations.rotate(piece);
    const updated = pieces.map(item => item.id === piece.id ? next : item);
    setPieces(updated);
    setFeedback(engine.connected(updated) ? "ready" : "building");
    if (engine.rotations.isAligned(next)) metrics.current.correctRotations += 1;
    else metrics.current.incorrectRotations += 1;
    sounds.current?.play(engine.rotations.isAligned(next) ? 520 : 260, .08);
  };

  const launch = (eventTime: number) => {
    if (disabled || running || finished.current) return;
    setRunning(true); setFeedback("running"); metrics.current.roundsPlayed += 1;
    metrics.current.highestDifficulty = Math.max(metrics.current.highestDifficulty, puzzle.difficulty);
    const wasConnected = engine.connected(pieces);
    const route = physics.route({ ...puzzle, pieces }, wasConnected);
    let index = 0;
    sounds.current?.play(440, .22);
    const step = window.setInterval(() => {
      setTrainIndex(index); sounds.current?.play(350 + index * 12, .07); index += 1;
      if (index < route.length) return;
      window.clearInterval(step);
      if (wasConnected) {
        metrics.current.successfulRoutes += 1; metrics.current.tracksCompleted += pieces.length;
        metrics.current.completionTimes.push(Math.max(0, eventTime - startedAt.current));
        setFeedback("success"); setConfetti(true); sounds.current?.play(720, .35);
      } else { setFeedback("blocked"); sounds.current?.play(150, .28); }
      setCompletedRounds(metrics.current.roundsPlayed);
      const timeout = window.setTimeout(() => {
        if (metrics.current.roundsPlayed >= maxRounds) { void finish(); return; }
        const next = engine.next();
        setPuzzle(next);
        setPieces(next.pieces);
        setTrainIndex(-1); setRunning(false); setConfetti(false); setFeedback(engine.connected(next.pieces) ? "ready" : "building");
        startedAt.current = performance.now();
      }, wasConnected ? 1050 : 850);
      timers.current.push(timeout);
    }, 280);
  };

  const trainCell = trainIndex < 0 ? { row: puzzle.route[0].row, col: -1 } : trainIndex >= puzzle.route.length ? puzzle.station : puzzle.route[trainIndex];
  const progress = Math.min(100, completedRounds / TOTAL_ROUNDS * 100);

  return <div className="tt-world" role="application" aria-label="Train Track Builder cognitive assessment">
    <div className="tt-progress" aria-label={`${completedRounds} of ${TOTAL_ROUNDS} routes completed`}><span style={{ width: `${progress}%` }} /></div>
    <div className={`tt-status tt-status--${feedback}`} aria-live="polite">{feedback === "ready" || feedback === "success" ? <Check /> : feedback === "blocked" ? <CircleAlert /> : <TrainFront />}<div><small>Route {Math.min(completedRounds + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</small></div></div>
    <div className="tt-timer"><Timer /><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div>
    <div className="tt-level" aria-hidden>{Array.from({ length: TOTAL_ROUNDS }, (_, index) => <i key={index} className={index < completedRounds ? "done" : index === completedRounds ? "active" : ""} />)}</div>
    <div className="tt-clouds" aria-hidden><i /><i /><i /></div><div className="tt-mountains" aria-hidden><i /><i /><i /></div>
    <main className={`tt-board ${connected ? "tt-board--ready" : ""}`} style={{ "--rows": puzzle.rows, "--cols": puzzle.cols, "--tile": `min(17vh, ${88 / (puzzle.cols + 1.35)}vw)` } as React.CSSProperties}>
      {pieces.map(piece => { const aligned = engine.rotations.isAligned(piece); return <button type="button" key={piece.id} disabled={disabled || running} className={`tt-piece tt-${piece.kind} ${aligned ? "is-aligned" : "is-misaligned"}`} style={{ gridRow: piece.row + 1, gridColumn: piece.col + 1, "--rotation": `${piece.rotation * 90}deg` } as React.CSSProperties} onClick={() => rotate(piece)} aria-label={`${aligned ? "Connected" : "Disconnected"} railway track. Click to rotate.`}><span className="tt-rail"><i /><b /></span>{piece.kind === "bridge" && <em />}</button>; })}
      <div className={`tt-train ${running ? "is-running" : ""}`} style={trainPosition(trainCell.row, trainCell.col, puzzle.rows, puzzle.cols)} aria-hidden><span>🚂</span><i /><i /><i /></div>
      <div className={`tt-station ${feedback === "success" ? "is-reached" : ""}`} style={{ gridRow: puzzle.station.row + 1, gridColumn: puzzle.cols + 1 }} aria-hidden><span>🏁</span><b /></div>
    </main>
    <button type="button" disabled={disabled || running} onClick={event => launch(event.timeStamp)} className={`tt-start ${connected ? "is-ready" : ""}`}>{running ? "GOING…" : connected ? "SEND TRAIN" : "TEST ROUTE"}</button>
    <div className="tt-trees" aria-hidden>{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
    {confetti && <div className="tt-confetti" aria-hidden>{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--x": `${index * 43 % 100}%`, "--delay": `${index % 6 * 45}ms` } as React.CSSProperties} />)}</div>}
  </div>;
}
