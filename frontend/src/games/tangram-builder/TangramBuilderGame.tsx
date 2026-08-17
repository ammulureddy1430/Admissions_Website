"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, RotateCcw, RotateCw, SkipForward, Timer } from "lucide-react";
import { TANGRAM_LEVELS } from "./Levels";
import {
  clampPosition,
  createPieces,
  distance,
  puzzleCompleted,
  settlePiece,
  slotFor,
} from "./TangramEngine";
import { scoreTangram } from "./ScoringEngine";
import type { TangramAttempt, TangramMetrics, TangramPieceState } from "./Types";
import "./TangramBuilderGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: TangramMetrics) => void | Promise<void>;
};

type DragState = {
  pointerId: number;
  pieceId: string;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  wasPlaced: boolean;
};

function PieceShape({ piece, silhouette = false }: { piece: TangramPieceState; silhouette?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <polygon
        points={piece.points}
        fill={silhouette ? "#16364a" : piece.color}
        stroke="none"
      />
    </svg>
  );
}

export default function TangramBuilderGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = TANGRAM_LEVELS[levelIndex];
  const timeLeft = Math.max(0, remainingSeconds ?? 120);
  const pieceUnit =
    level.pieces.length <= 3
      ? 4.5
      : level.pieces.length === 4
        ? 4
        : level.pieces.length === 5
          ? 3.6
          : level.pieces.length === 6
            ? 3.3
            : 3;
  const [pieces, setPieces] = useState(() => createPieces(level));
  const [selected, setSelected] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const attempts = useRef<TangramAttempt[]>([]);
  const levelStarted = useRef(0);
  const finished = useRef(false);
  const transitionTimer = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { levelStarted.current = performance.now(); }, []);

  const attemptFrom = useCallback((state: TangramPieceState[], completed: boolean): TangramAttempt => ({
    levelId: level.id,
    difficulty: level.difficulty,
    completed,
    piecesMoved: state.reduce((sum, piece) => sum + piece.moveCount, 0),
    piecesRotated: state.reduce((sum, piece) => sum + piece.rotationCount, 0),
    unnecessaryMovements: state.reduce((sum, piece) => {
      const slot = slotFor(level, piece.id);
      return sum + Math.max(0, piece.moveCount - (piece.placed ? 1 : 0)) + (slot && piece.travel > distance(piece, slot) * 3 ? 1 : 0);
    }, 0),
    unnecessaryRotations: state.reduce((sum, piece) => {
      const slot = slotFor(level, piece.id);
      return sum + Math.max(0, piece.rotationCount - (slot && piece.placed ? 1 : 0));
    }, 0),
    placementAttempts: state.reduce((sum, piece) => sum + piece.placementAttempts, 0),
    successfulPlacements: state.filter((piece) => piece.placed).length,
    repositioning: state.reduce((sum, piece) => sum + piece.repositionCount, 0),
    completionTime: Math.round(performance.now() - levelStarted.current),
  }), [level]);

  const finish = useCallback((status: string, current?: TangramPieceState[]) => {
    if (finished.current) return;
    finished.current = true;
    dragRef.current = null;
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    const recorded = [...attempts.current];
    if (current && current.some((piece) => piece.moveCount || piece.rotationCount))
      recorded.push(attemptFrom(current, false));
    void onCompleteRef.current(scoreTangram(recorded, status));
  }, [attemptFrom]);

  useEffect(() => {
    if (!practiceOnly && remainingSeconds !== undefined && remainingSeconds <= 0)
      finish("TIME_LIMIT_REACHED", pieces);
  }, [finish, pieces, practiceOnly, remainingSeconds]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  const advance = useCallback((completedPieces: TangramPieceState[]) => {
    attempts.current.push(attemptFrom(completedPieces, true));
    setTransitioning(true);
    transitionTimer.current = window.setTimeout(() => {
      transitionTimer.current = null;
      if (levelIndex + 1 >= TANGRAM_LEVELS.length) {
        finish("COMPLETED");
        return;
      }
      const nextIndex = levelIndex + 1;
      setLevelIndex(nextIndex);
      setPieces(createPieces(TANGRAM_LEVELS[nextIndex]));
      setSelected(null);
      levelStarted.current = performance.now();
      setTransitioning(false);
    }, 550);
  }, [attemptFrom, finish, levelIndex]);

  const rotate = (amount: number) => {
    if (!selected || disabled || transitioning || finished.current) return;
    setPieces((current) => current.map((piece) => piece.id === selected ? {
      ...piece,
      rotation: piece.rotation + amount,
      placed: false,
      rotationCount: piece.rotationCount + 1,
      repositionCount: piece.repositionCount + (piece.placed ? 1 : 0),
    } : piece));
  };

  const pointerDown = (event: React.PointerEvent, piece: TangramPieceState) => {
    if (disabled || transitioning || finished.current) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const x = ((event.clientX - board.left) / board.width) * 100;
    const y = ((event.clientY - board.top) / board.height) * 100;
    dragRef.current = {
      pointerId: event.pointerId,
      pieceId: piece.id,
      offsetX: x - piece.x,
      offsetY: y - piece.y,
      startX: piece.x,
      startY: piece.y,
      wasPlaced: piece.placed,
    };
    setSelected(piece.id);
  };

  const pointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const board = boardRef.current?.getBoundingClientRect();
    if (!drag || drag.pointerId !== event.pointerId || !board) return;
    const x = clampPosition(((event.clientX - board.left) / board.width) * 100 - drag.offsetX);
    const y = clampPosition(((event.clientY - board.top) / board.height) * 100 - drag.offsetY);
    setPieces((current) => current.map((piece) => piece.id === drag.pieceId ? { ...piece, x, y, placed: false } : piece));
  };

  const pointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setPieces((current) => {
      const moved = current.map((piece) => piece.id === drag.pieceId ? {
        ...piece,
        moveCount: piece.moveCount + 1,
        repositionCount: piece.repositionCount + (drag.wasPlaced ? 1 : 0),
        travel: piece.travel + Math.hypot(piece.x - drag.startX, piece.y - drag.startY),
      } : piece);
      const settled = settlePiece(moved, level, drag.pieceId);
      if (puzzleCompleted(settled, level)) window.setTimeout(() => advance(settled), 0);
      return settled;
    });
  };

  const reset = () => {
    if (disabled || transitioning || finished.current) return;
    setPieces((current) => createPieces(level).map((piece, index) => ({
      ...piece,
      moveCount: current[index]?.moveCount || 0,
      rotationCount: current[index]?.rotationCount || 0,
      placementAttempts: current[index]?.placementAttempts || 0,
      repositionCount: (current[index]?.repositionCount || 0) + (current[index]?.placed ? 1 : 0),
      travel: current[index]?.travel || 0,
    })));
    setSelected(null);
  };

  const previewNext = () => {
    if (!practiceOnly || disabled || transitioning || finished.current) return;
    setTransitioning(true);
    transitionTimer.current = window.setTimeout(() => {
      transitionTimer.current = null;
      const nextIndex = (levelIndex + 1) % TANGRAM_LEVELS.length;
      setLevelIndex(nextIndex);
      setPieces(createPieces(TANGRAM_LEVELS[nextIndex]));
      setSelected(null);
      levelStarted.current = performance.now();
      setTransitioning(false);
    }, 300);
  };

  return (
    <div className={`tangram-game${transitioning ? " is-transitioning" : ""}`}>
      <div className="tangram-game__progress" aria-hidden>
        {TANGRAM_LEVELS.map((item, index) => <i key={item.id} className={index <= levelIndex ? "is-active" : ""} />)}
      </div>
      <div className={`tangram-game__timer${timeLeft <= 15 ? " is-low" : ""}`} role="timer" aria-label={`${timeLeft} seconds remaining`}>
        <Timer aria-hidden />
        <strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</strong>
      </div>
      <div className="tangram-game__target" aria-label="Target silhouette">
        <span className="tangram-game__area-label" aria-hidden>TARGET</span>
        {pieces.map((piece) => {
          const slot = slotFor(level, piece.id)!;
          return <div key={piece.id} className="tangram-game__target-piece" style={{ left: `calc(50% + ${slot.targetOffsetX ?? 0}px)`, top: `calc(50% + ${slot.targetOffsetY ?? 0}px)`, width: `${piece.width * pieceUnit * 0.75}px`, height: `${piece.height * pieceUnit * 0.75}px`, transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)` }}><PieceShape piece={piece} silhouette /></div>;
        })}
      </div>
      <div
        ref={boardRef}
        className="tangram-game__board"
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <div className="tangram-game__work-zone" aria-hidden>
          <span>MAKE THIS SHAPE</span>
        </div>
        {pieces.map((piece) => (
          <button
            type="button"
            key={piece.id}
            aria-label="Tangram piece"
            className={`tangram-game__piece${selected === piece.id ? " is-selected" : ""}`}
            style={{
              left: `${piece.x}%`,
              top: `${piece.y}%`,
              width: `${piece.width * pieceUnit}px`,
              height: `${piece.height * pieceUnit}px`,
              transform: `translate(-50%, -50%) rotate(${piece.rotation}deg)`,
              zIndex: selected === piece.id ? 20 : piece.placed ? 5 : 10,
            }}
            onPointerDown={(event) => pointerDown(event, piece)}
            disabled={disabled || transitioning}
          >
            <PieceShape piece={piece} />
          </button>
        ))}
      </div>
      <div className="tangram-game__controls">
        <button type="button" aria-label="Rotate left" onClick={() => rotate(-45)} disabled={!selected || disabled || transitioning}><RotateCcw /></button>
        <button type="button" aria-label="Reset puzzle" onClick={reset} disabled={disabled || transitioning}><RefreshCw /></button>
        <button type="button" aria-label="Rotate right" onClick={() => rotate(45)} disabled={!selected || disabled || transitioning}><RotateCw /></button>
        {practiceOnly && <button type="button" className="tangram-game__next" aria-label="Next round" onClick={previewNext} disabled={disabled || transitioning}><SkipForward /></button>}
      </div>
    </div>
  );
}
