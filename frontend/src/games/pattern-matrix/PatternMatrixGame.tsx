"use client";
/* eslint-disable react-hooks/purity, react-hooks/refs */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PatternMatrixMetrics } from "./Types";
import "./pattern-matrix.css";

type Props = {
  disabled?: boolean;
  remainingSeconds: number;
  practiceOnly?: boolean;
  onComplete: (metrics: PatternMatrixMetrics) => void | Promise<void>;
};

const TOTAL_ROUNDS = 2;

function patternFor(round: number) {
  const size = round < 4 ? 3 : round < 8 ? 4 : 5;
  const count = Math.min(3 + round, 8);
  const cells = new Set<number>();
  while (cells.size < count) cells.add(Math.floor(Math.random() * size * size));
  return { size, cells: [...cells], difficulty: size - 2 };
}

export default function PatternMatrixGame({ disabled = false, remainingSeconds, practiceOnly = false, onComplete }: Props) {
  const initial = useRef(patternFor(0));
  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState(initial.current);
  const [phase, setPhase] = useState<"show" | "recall" | "done">("show");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const startedAt = useRef(new Date().toISOString());
  const responseStarted = useRef(Date.now());
  const done = useRef(false);
  const stats = useRef({ rounds: 0, correct: 0, missed: 0, incorrect: 0, actions: 0, responseTimes: [] as number[], highestDifficulty: 1 });

  const finish = useCallback(async (status: "COMPLETED" | "PARTIAL" = "COMPLETED") => {
    if (done.current) return;
    done.current = true;
    setPhase("done");
    const value = stats.current;
    const possible = value.correct + value.missed;
    const accuracy = possible + value.incorrect ? value.correct / (possible + value.incorrect) * 100 : 0;
    const averageResponse = value.responseTimes.length ? value.responseTimes.reduce((sum, item) => sum + item, 0) / value.responseTimes.length : 0;
    const visualMemory = Math.min(100, accuracy * .75 + value.highestDifficulty * 8);
    const attention = Math.max(0, Math.min(100, accuracy - value.incorrect * 1.5));
    const spatialRecall = possible ? Math.min(100, value.correct / possible * 100) : 0;
    const processingSpeed = Math.max(0, Math.min(100, 100 - Math.max(0, averageResponse - 2) * 8));
    const completion = Math.min(100, value.rounds / TOTAL_ROUNDS * 100);
    const metrics: PatternMatrixMetrics = {
      age_group: "5–7 Years", rounds_presented: Math.max(1, value.rounds + (phase === "recall" ? 1 : 0)), rounds_completed: value.rounds,
      correct_cells: value.correct, missed_cells: value.missed, incorrect_cells: value.incorrect, total_actions: value.actions,
      average_response_time: Math.round(averageResponse * 100) / 100, highest_difficulty: value.highestDifficulty,
      accuracy: Math.round(accuracy * 10) / 10, visual_memory_score: Math.round(visualMemory * 10) / 10,
      attention_score: Math.round(attention * 10) / 10, spatial_recall_score: Math.round(spatialRecall * 10) / 10,
      processing_speed_score: Math.round(processingSpeed * 10) / 10, completion_percentage: Math.round(completion * 10) / 10,
      overall_score: Math.round((visualMemory + attention + spatialRecall + processingSpeed) / 4 * 10) / 10,
      started_at: startedAt.current, completed_at: new Date().toISOString(), completionStatus: status,
    };
    await onComplete(metrics);
  }, [onComplete, phase]);

  useEffect(() => {
    if (disabled || done.current) return;
    const delay = Math.max(850, 1500 - round * 60);
    const timer = window.setTimeout(() => { setPhase("recall"); responseStarted.current = Date.now(); }, delay);
    return () => window.clearTimeout(timer);
  }, [disabled, pattern, round]);

  useEffect(() => { if (!practiceOnly && remainingSeconds <= 0) void finish("PARTIAL"); }, [finish, practiceOnly, remainingSeconds]);

  const toggle = (index: number) => {
    if (disabled || phase !== "recall" || done.current) return;
    stats.current.actions++;
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const submit = () => {
    if (disabled || phase !== "recall" || done.current || selected.size === 0) return;
    const target = new Set(pattern.cells);
    stats.current.correct += [...selected].filter(cell => target.has(cell)).length;
    stats.current.incorrect += [...selected].filter(cell => !target.has(cell)).length;
    stats.current.missed += pattern.cells.filter(cell => !selected.has(cell)).length;
    stats.current.responseTimes.push((Date.now() - responseStarted.current) / 1000);
    stats.current.rounds++;
    stats.current.highestDifficulty = Math.max(stats.current.highestDifficulty, pattern.difficulty);
    if (stats.current.rounds >= TOTAL_ROUNDS) { void finish(); return; }
    const nextRound = round + 1;
    setRound(nextRound); setSelected(new Set()); setPattern(patternFor(nextRound)); setPhase("show");
  };

  return <main className="pattern-matrix-game">
    <header><div><small>PATTERN MATRIX</small><h2>Remember the glowing tiles</h2></div><div className="pattern-round">Round {Math.min(round + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</div></header>
    <p className="pattern-instruction">{phase === "show" ? "Look carefully. The tiles will hide." : phase === "recall" ? "Tap the tiles you remember, then continue." : "Challenge complete."}</p>
    <section className="pattern-board" style={{ gridTemplateColumns: `repeat(${pattern.size}, 1fr)` }} aria-label="Pattern memory grid">
      {Array.from({ length: pattern.size * pattern.size }, (_, index) => <button key={index} type="button" aria-label={`Tile ${index + 1}`} disabled={disabled || phase !== "recall"} onClick={() => toggle(index)} className={`${phase === "show" && pattern.cells.includes(index) ? "shown" : ""} ${selected.has(index) ? "selected" : ""}`} />)}
    </section>
    <footer><span>{phase === "show" ? "Observe" : "Choose every remembered tile"}</span><button type="button" disabled={disabled || phase !== "recall" || selected.size === 0} onClick={submit}>Continue</button></footer>
  </main>;
}
