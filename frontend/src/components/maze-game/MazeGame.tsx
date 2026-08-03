"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle, Diamond, DoorOpen,
  Footprints, Goal, Keyboard, MousePointer2, Sparkles, Square, Star, Triangle,
} from "lucide-react";

type Position = { row: number; col: number };
type MazeCell = Position & { walls: { n: boolean; e: boolean; s: boolean; w: boolean } };
type MazeItem = Position & { id: string; kind: string; label: string; required: boolean; order: number };
type MazeSwitch = Position & { id: string; order: number };
type MazeChallengeOption = { id: string; optionKey: string; optionText: string; imageUrl?: string | null };
type MazeChallenge = Position & { id: string; questionId: string; questionText: string; difficulty: string; pageNumber?: number; index: number; options?: MazeChallengeOption[] };
type MazeData = {
  type: "CLASSIC" | "COLLECT_EXIT" | "NUMBER" | "SHAPE" | "LOGIC";
  title: string; mission: string; size: number; grade: string; difficulty: string;
  cells: MazeCell[]; start: Position; exit: Position; player: Position;
  collectibles: MazeItem[]; collected: string[]; switches: MazeSwitch[];
  obstacles: Array<Position & { id: string; phase: number }>;
  challenges?: MazeChallenge[]; completedChallenges?: string[];
  sequenceIndex: number; activatedSwitches?: string[]; moves: number;
  theme: { id: string; name: string; accent: string; glow: string };
};

type Direction = "n" | "e" | "s" | "w";
const DIRECTIONS: Record<Direction, { dr: number; dc: number; opposite: Direction }> = {
  n: { dr: -1, dc: 0, opposite: "s" }, e: { dr: 0, dc: 1, opposite: "w" },
  s: { dr: 1, dc: 0, opposite: "n" }, w: { dr: 0, dc: -1, opposite: "e" },
};

export function MazeGame({
  maze,
  disabled,
  sound,
  practiceOnly = false,
  onProgress,
  onChallenge,
  onComplete,
}: {
  maze: MazeData;
  disabled: boolean;
  sound: boolean;
  practiceOnly?: boolean;
  seconds: number;
  onProgress: (progress: Record<string, unknown>) => Promise<unknown>;
  onChallenge: (payload: Record<string, unknown>) => Promise<unknown>;
  onComplete: (progress: Record<string, unknown>) => Promise<unknown>;
}) {
  const [player, setPlayer] = useState<Position>(maze.player || maze.start);
  const [collected, setCollected] = useState<string[]>(maze.collected || []);
  const [switches, setSwitches] = useState<string[]>(maze.activatedSwitches || []);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(maze.completedChallenges || []);
  const [activeChallenge, setActiveChallenge] = useState<MazeChallenge | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(Number(maze.sequenceIndex || 0));
  const [moves, setMoves] = useState(Number(maze.moves || 0));
  const [particles, setParticles] = useState<Array<{ id: number; row: number; col: number }>>([]);
  const [toast, setToast] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const startedAt = useRef(0);
  const touchStart = useRef<Position | null>(null);
  const saveTimer = useRef<number | null>(null);
  const completionBusy = useRef(false);
  const cellMap = useMemo(() => new Map(maze.cells.map((cell) => [`${cell.row}:${cell.col}`, cell])), [maze.cells]);
  const required = maze.collectibles.filter((item) => item.required);
  const objectiveDone = maze.type === "LOGIC"
    ? switches.length >= maze.switches.length
    : maze.type === "NUMBER"
      ? sequenceIndex >= required.length
      : required.every((item) => collected.includes(item.id));
  const progress = maze.type === "CLASSIC" ? Math.min(92, Math.round((moves / Math.max(maze.size * 2, 1)) * 100))
    : Math.round(((maze.type === "LOGIC" ? switches.length : maze.type === "NUMBER" ? sequenceIndex : collected.filter((id) => required.some((item) => item.id === id)).length) / Math.max(maze.type === "LOGIC" ? maze.switches.length : required.length, 1)) * 100);

  const playTone = useCallback((frequency: number, duration = 0.1) => {
    if (!sound) return;
    try {
      const AudioContext = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch {}
  }, [sound]);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const save = useCallback((nextPlayer: Position, nextCollected: string[], nextSequence: number, nextSwitches: string[], nextChallenges: string[], nextMoves: number) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await onProgress({ ...nextPlayer, collected: nextCollected, sequenceIndex: nextSequence, switches: nextSwitches, completedChallenges: nextChallenges, moves: nextMoves });
    }, 450);
  }, [onProgress]);

  const finish = useCallback(async (position: Position, finalCollected: string[], finalSequence: number, finalSwitches: string[], finalChallenges: string[], finalMoves: number) => {
    if (completionBusy.current) return;
    completionBusy.current = true;
    setCelebrating(true);
    playTone(784, 0.18);
    window.setTimeout(() => playTone(1046, 0.24), 130);
    navigator.vibrate?.([40, 30, 80]);
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    await onComplete({
      ...position, collected: finalCollected, sequenceIndex: finalSequence, switches: finalSwitches, completedChallenges: finalChallenges,
      moves: finalMoves, timeTaken: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
    });
  }, [onComplete, playTone]);

  const move = useCallback((direction: Direction) => {
    if (disabled || celebrating || activeChallenge || completionBusy.current) return;
    const cell = cellMap.get(`${player.row}:${player.col}`);
    if (!cell || cell.walls[direction]) { playTone(130, 0.08); setToast("That path is blocked"); return; }
    const delta = DIRECTIONS[direction];
    const next = { row: player.row + delta.dr, col: player.col + delta.dc };
    if (!cellMap.has(`${next.row}:${next.col}`)) return;
    const checkpoint = maze.challenges?.find((entry) => entry.row === next.row && entry.col === next.col && !completedChallenges.includes(entry.id));
    const nextRequiredCheckpoint = [...(maze.challenges || [])]
      .filter((entry) => !completedChallenges.includes(entry.id))
      .sort((a, b) => Number(a.index) - Number(b.index))[0];
    if (checkpoint && nextRequiredCheckpoint && checkpoint.id !== nextRequiredCheckpoint.id) {
      setToast(`Go to checkpoint ${nextRequiredCheckpoint.index} first`);
      playTone(145, 0.14);
      return;
    }
    let nextCollected = collected;
    let nextSequence = sequenceIndex;
    let nextSwitches = switches;
    let nextCompletedChallenges = completedChallenges;
    const item = maze.collectibles.find((entry) => entry.row === next.row && entry.col === next.col && !collected.includes(entry.id));
    if (item) {
      if (maze.type === "NUMBER" && item.order !== sequenceIndex + 1) {
        setToast(`Find ${sequenceIndex + 1} next`);
        playTone(160, 0.12);
      } else if (maze.type === "SHAPE" && !item.required) {
        setToast("Avoid that shape");
        playTone(150, 0.12);
        navigator.vibrate?.(30);
      } else {
        nextCollected = [...collected, item.id];
        nextSequence = maze.type === "NUMBER" ? sequenceIndex + 1 : sequenceIndex;
        setCollected(nextCollected); setSequenceIndex(nextSequence);
        setParticles((current) => [...current, { id: Date.now(), row: next.row, col: next.col }]);
        setToast(maze.type === "NUMBER" ? `${item.label} collected` : "Collected!");
        playTone(620 + nextCollected.length * 55, 0.14);
      }
    }
    const rune = maze.switches.find((entry) => entry.row === next.row && entry.col === next.col && !switches.includes(entry.id));
    if (rune) {
      if (rune.order === switches.length + 1) {
        nextSwitches = [...switches, rune.id]; setSwitches(nextSwitches);
        setToast(`Rune ${rune.order} activated`); playTone(520 + rune.order * 80, 0.18);
      } else {
        setToast(`Activate rune ${switches.length + 1} first`); playTone(150, 0.12);
      }
    }
    const nextMoves = moves + 1;
    setPlayer(next); setMoves(nextMoves);
    playTone(235, 0.035);
    if (checkpoint) {
      if (practiceOnly) {
        nextCompletedChallenges = [...completedChallenges, checkpoint.id];
        setCompletedChallenges(nextCompletedChallenges);
        setToast(`Checkpoint ${checkpoint.index} cleared`);
        setParticles((current) => [...current, { id: Date.now(), row: next.row, col: next.col }]);
        playTone(760, 0.16);
      } else {
        window.setTimeout(() => setActiveChallenge(checkpoint), 180);
        setToast(`Question checkpoint ${checkpoint.index}`);
      }
    }
    save(next, nextCollected, nextSequence, nextSwitches, nextCompletedChallenges, nextMoves);
    if (practiceOnly && checkpoint && nextCompletedChallenges.length >= 2) {
      void finish(next, nextCollected, nextSequence, nextSwitches, nextCompletedChallenges, nextMoves);
      return;
    }
    if (next.row === maze.exit.row && next.col === maze.exit.col) {
      const allCollected = required.every((entry) => nextCollected.includes(entry.id));
      const allSwitches = nextSwitches.length >= maze.switches.length;
      const mazeReady = maze.type === "LOGIC" ? allSwitches : maze.type === "NUMBER" ? nextSequence >= required.length : allCollected;
      const questionsReady = (maze.challenges || []).every((entry) => nextCompletedChallenges.includes(entry.id));
      if (mazeReady && questionsReady) void finish(next, nextCollected, nextSequence, nextSwitches, nextCompletedChallenges, nextMoves);
      else { setToast(!questionsReady ? "Complete every question checkpoint" : maze.type === "LOGIC" ? "The portal is locked" : "Complete the mission first"); playTone(120, 0.18); }
    }
  }, [disabled, celebrating, activeChallenge, cellMap, player, collected, sequenceIndex, switches, completedChallenges, maze, moves, required, practiceOnly, playTone, save, finish]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const direction = key === "arrowup" || key === "w" ? "n" : key === "arrowright" || key === "d" ? "e" : key === "arrowdown" || key === "s" ? "s" : key === "arrowleft" || key === "a" ? "w" : null;
      if (direction) { event.preventDefault(); move(direction); }
    };
    window.addEventListener("keydown", keyboard, { passive: false });
    return () => window.removeEventListener("keydown", keyboard);
  }, [move]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!particles.length) return;
    const timer = window.setTimeout(() => setParticles((current) => current.slice(1)), 800);
    return () => window.clearTimeout(timer);
  }, [particles]);

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  const clickCell = (row: number, col: number) => {
    const dr = row - player.row, dc = col - player.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return;
    move(dr === -1 ? "n" : dr === 1 ? "s" : dc === 1 ? "e" : "w");
  };
  const objectiveLabel = maze.type === "LOGIC" ? `${switches.length}/${maze.switches.length} runes`
    : maze.type === "CLASSIC" ? `${moves} moves`
      : `${maze.type === "NUMBER" ? sequenceIndex : collected.filter((id) => required.some((item) => item.id === id)).length}/${required.length} collected`;

  return (
    <div className={`maze-adventure maze-theme-${maze.theme.id}`} style={{ "--maze-accent": maze.theme.accent, "--maze-glow": maze.theme.glow } as React.CSSProperties}>
      <div className="maze-floating-lights" aria-hidden><i /><i /><i /></div>
      <div className="maze-game-heading">
        <div>
          <span className="maze-kicker"><Sparkles /> {maze.theme.name}</span>
          <h1>{maze.title}</h1>
          <p>{maze.mission}</p>
        </div>
        <div className="maze-mission-card">
          <span>{objectiveDone ? "Portal unlocked" : "Mission progress"}</span>
          <strong>{objectiveLabel}</strong>
          <div><i style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} /></div>
        </div>
      </div>

      <div className="maze-stage">
        <div className="maze-camera">
          <div
            className="maze-board"
            style={{ "--maze-size": maze.size } as React.CSSProperties}
            onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { row: touch.clientY, col: touch.clientX }; }}
            onTouchEnd={(event) => {
              if (!touchStart.current) return;
              const touch = event.changedTouches[0], dx = touch.clientX - touchStart.current.col, dy = touch.clientY - touchStart.current.row;
              touchStart.current = null;
              if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
              move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : (dy > 0 ? "s" : "n"));
            }}
          >
            {maze.cells.map((cell) => {
              const item = maze.collectibles.find((entry) => entry.row === cell.row && entry.col === cell.col && !collected.includes(entry.id));
              const rune = maze.switches.find((entry) => entry.row === cell.row && entry.col === cell.col);
              const isPlayer = player.row === cell.row && player.col === cell.col;
              const isExit = maze.exit.row === cell.row && maze.exit.col === cell.col;
              const isStart = maze.start.row === cell.row && maze.start.col === cell.col;
              const obstacle = maze.obstacles.find((entry) => entry.row === cell.row && entry.col === cell.col);
              const challenge = maze.challenges?.find((entry) => entry.row === cell.row && entry.col === cell.col && !completedChallenges.includes(entry.id));
              return (
                <button
                  type="button"
                  aria-label={`Maze cell row ${cell.row + 1}, column ${cell.col + 1}${isPlayer ? ", player position" : ""}${isExit ? ", exit" : ""}`}
                  key={`${cell.row}:${cell.col}`}
                  onClick={() => clickCell(cell.row, cell.col)}
                  className={`maze-cell ${isExit ? "is-exit" : ""} ${isStart ? "is-start" : ""}`}
                  style={{
                    gridRow: cell.row + 1, gridColumn: cell.col + 1,
                    borderTopColor: cell.walls.n ? "rgba(126,241,230,.76)" : "transparent",
                    borderRightColor: cell.walls.e ? "rgba(126,241,230,.76)" : "transparent",
                    borderBottomColor: cell.walls.s ? "rgba(126,241,230,.76)" : "transparent",
                    borderLeftColor: cell.walls.w ? "rgba(126,241,230,.76)" : "transparent",
                  }}
                >
                  {isStart && !isPlayer && <span className="maze-start-marker"><Goal /></span>}
                  {isExit && <span className={`maze-exit ${objectiveDone ? "is-unlocked" : "is-locked"}`}><DoorOpen /></span>}
                  {obstacle && <span className={`maze-obstacle obstacle-phase-${obstacle.phase}`} aria-hidden />}
                  {item && <Collectible item={item} />}
                  {rune && <span className={`maze-rune ${switches.includes(rune.id) ? "is-active" : ""}`}><Sparkles /><b>{rune.order}</b></span>}
                  {challenge && <span className="maze-question-gate"><DoorOpen /><b>{challenge.index}</b></span>}
                  {isPlayer && <span className="maze-player"><span className="maze-explorer-avatar">🧑‍🚀</span><span className="maze-player-body"><Footprints /></span></span>}
                  {particles.filter((particle) => particle.row === cell.row && particle.col === cell.col).map((particle) => <span key={particle.id} className="maze-particles"><i /><i /><i /><i /><i /></span>)}
                </button>
              );
            })}
          </div>
        </div>
        {toast && <div className="maze-toast" role="status">{toast}</div>}
        {activeChallenge && <MazeQuestionCheckpoint
          challenge={activeChallenge}
          total={maze.challenges?.length || 0}
          onSubmit={async (answer, timeTaken) => {
            await onChallenge({ challengeId: activeChallenge.id, answer, timeTaken });
            const nextChallenges = [...completedChallenges, activeChallenge.id];
            setCompletedChallenges(nextChallenges);
            setActiveChallenge(null);
            setToast("The gate opens");
            setParticles((current) => [...current, { id: Date.now(), row: player.row, col: player.col }]);
            playTone(760, 0.16);
            save(player, collected, sequenceIndex, switches, nextChallenges, moves);
          }}
        />}
        {celebrating && <Celebration />}
      </div>

      <div className="maze-footer">
        <div className="maze-control-help"><Keyboard /><span><b>Arrow keys / WASD</b> to move</span><MousePointer2 /><span><b>Click, tap, or swipe</b> on mobile</span></div>
        <div className="maze-dpad" aria-label="Maze movement controls">
          <button onClick={() => move("n")} aria-label="Move up"><ArrowUp /></button>
          <button onClick={() => move("w")} aria-label="Move left"><ArrowLeft /></button>
          <span><Footprints /></span>
          <button onClick={() => move("e")} aria-label="Move right"><ArrowRight /></button>
          <button onClick={() => move("s")} aria-label="Move down"><ArrowDown /></button>
        </div>
      </div>
    </div>
  );
}

function Collectible({ item }: { item: MazeItem }) {
  const Icon = item.kind === "circle" ? Circle : item.kind === "triangle" ? Triangle : item.kind === "square" ? Square : item.kind === "diamond" ? Diamond : Star;
  return <span className={`maze-collectible ${item.required ? "is-required" : "is-decoy"}`}><Icon /><b>{item.kind === "number" ? item.label : ""}</b></span>;
}

function Celebration() {
  return <div className="maze-celebration" aria-live="polite"><div className="maze-confetti" aria-hidden>{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ "--confetti-index": index } as React.CSSProperties} />)}</div><Sparkles /><h2>Maze complete!</h2><p>Your adventure has been submitted.</p></div>;
}

function MazeQuestionCheckpoint({ challenge, total, onSubmit }: { challenge: MazeChallenge; total: number; onSubmit: (answer: string, timeTaken: number) => Promise<void> }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(0);
  useEffect(() => { openedAt.current = Date.now(); }, [challenge.id]);
  const submit = async (value = answer) => {
    if (!value.trim() || busy) return;
    setBusy(true);
    await onSubmit(value.trim(), Math.max(0, Math.round((Date.now() - openedAt.current) / 1000)));
  };
  return <div className="maze-question-overlay" role="dialog" aria-modal="true" aria-labelledby="maze-question-title">
    <section className="maze-magic-tablet">
      <div className="maze-question-number"><DoorOpen /><span>Runic gate {challenge.index} of {total}</span><b>{challenge.difficulty}</b></div>
      <h2 id="maze-question-title">{challenge.questionText}</h2>
      <p>Choose a rune to power the gate and continue the expedition.</p>
      {challenge.options?.length ? <div className="maze-rune-answers">
        {challenge.options.map((option, index) => <button type="button" key={option.id || option.optionKey} disabled={busy} onClick={() => void submit(option.optionText)}>
          <span>{["✦", "◆", "●", "▲"][index % 4]}</span>
          {option.imageUrl && <img src={option.imageUrl} alt="" />}
          <b>{option.optionText}</b>
        </button>)}
      </div> : <div className="maze-answer-entry">
        <input autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} placeholder="Speak the gate phrase" disabled={busy} />
        <button type="button" onClick={() => void submit()} disabled={busy || !answer.trim()}>{busy ? "Opening…" : "Power the gate"}</button>
      </div>}
    </section>
  </div>;
}
