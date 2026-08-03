"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Coins, Gem, KeyRound, Map, Sparkles, Star } from "lucide-react";
import "./AdventureGame.css";

type Option = { id?: string; optionKey?: string; optionText: string; imageUrl?: string | null };
type Question = { id: string; questionText: string; options?: Option[]; imageUrl?: string | null };
type World = "FOREST" | "CASTLE" | "TEMPLE";
type Point = { x: number; y: number };
type GameItem = { id: number; x: number; y: number; type: "coin" | "star"; collected: boolean; isFloating: boolean };

const checkpoints = [{ x: 18, y: 37 }, { x: 77, y: 35 }, { x: 24, y: 72 }, { x: 76, y: 70 }];

export function AdventureGame({ question, questionIndex, questionCount, configuration, disabled, sound, onAnswer }: {
  question: Question;
  questionIndex: number;
  questionCount: number;
  configuration?: Record<string, unknown>;
  disabled: boolean;
  sound: boolean;
  onAnswer: (answer: string) => Promise<unknown> | unknown;
}) {
  const world = adventureWorld(configuration, questionIndex);
  const options = question.options || [];
  const [player, setPlayer] = useState<Point>({ x: 50, y: 84 });
  const [items, setItems] = useState<GameItem[]>([]);
  const [selected, setSelected] = useState("");
  const [jumping, setJumping] = useState(false);
  const [running, setRunning] = useState(false);
  const busy = disabled || !!selected;

  const soundEffect = useCallback((frequency: number, duration = .08) => {
    if (!sound || typeof window === "undefined") return;
    try {
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const context = new Context();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {}
  }, [sound]);

  useEffect(() => {
    setPlayer({ x: 50, y: 84 });
    setSelected("");
    setJumping(false);
    setRunning(false);

    // Populate map items
    const initialItems: GameItem[] = [
      { id: 1, x: 34, y: 60, type: "coin", collected: false, isFloating: false },
      { id: 2, x: 66, y: 60, type: "coin", collected: false, isFloating: false },
      { id: 3, x: 50, y: 55, type: "star", collected: false, isFloating: true }, // Floating Star on the central pathway
      { id: 4, x: 30, y: 78, type: "coin", collected: false, isFloating: false },
      { id: 5, x: 70, y: 78, type: "coin", collected: false, isFloating: false },
      { id: 6, x: 18, y: 48, type: "star", collected: false, isFloating: true }, // Floating Star near Left-Top door
      { id: 7, x: 78, y: 46, type: "star", collected: false, isFloating: true }, // Floating Star near Right-Top door
    ];
    setItems(initialItems);
  }, [question.id]);

  // Collect detection logic
  useEffect(() => {
    if (busy) return;

    setItems(currentItems => {
      let updated = false;
      const nextItems = currentItems.map(item => {
        if (item.collected) return item;

        // Calculate distance from player to item
        const distance = Math.sqrt(Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2));

        // Use a slightly larger radius for floating stars so mid-jump pickups feel responsive
        const threshold = item.isFloating ? 9.0 : 6.5;

        if (distance < threshold) {
          if (item.isFloating) {
            // For floating items, player must be in jumping state to collect
            if (jumping) {
              updated = true;
              soundEffect(880, 0.15); // High pitched chime for star jump collection
              return { ...item, collected: true };
            }
          } else {
            // Ground items are collected simply by walking over them
            updated = true;
            soundEffect(720, 0.1); // Standard coin pickup chime
            return { ...item, collected: true };
          }
        }
        return item;
      });

      return updated ? nextItems : currentItems;
    });
  }, [player, jumping, busy, soundEffect]);

  const choose = useCallback(async (option: Option, index: number) => {
    if (busy) return;
    const key = option.id || option.optionKey || `${question.id}-${index}`;
    setPlayer(checkpoints[index % checkpoints.length]);
    setSelected(key);
    setRunning(true);
    soundEffect(590, .18);
    await onAnswer(option.optionText);
  }, [busy, onAnswer, question.id, soundEffect]);

  const move = useCallback((dx: number, dy: number) => {
    if (busy) return;
    setRunning(true);
    setPlayer(current => ({ x: Math.min(92, Math.max(8, current.x + dx)), y: Math.min(86, Math.max(19, current.y + dy)) }));
    soundEffect(175, .035);
    window.setTimeout(() => setRunning(false), 240);
  }, [busy, soundEffect]);

  const jump = useCallback(() => {
    if (busy || jumping) return;
    setJumping(true);
    soundEffect(360, .12);
    window.setTimeout(() => setJumping(false), 520);
  }, [busy, jumping, soundEffect]);

  useEffect(() => {
    if (busy) return;
    const reached = options.findIndex((_, index) => {
      const target = checkpoints[index % checkpoints.length];
      return Math.abs(player.x - target.x) <= 7 && Math.abs(player.y - target.y) <= 8;
    });
    if (reached >= 0) void choose(options[reached], reached);
  }, [busy, choose, options, player]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") move(-6, 0);
      if (key === "arrowright" || key === "d") move(6, 0);
      if (key === "arrowup" || key === "w") move(0, -6);
      if (key === "arrowdown" || key === "s") move(0, 6);
      if (key === " ") jump();
      if (key.startsWith("arrow") || ["w", "a", "s", "d", " "].includes(key)) event.preventDefault();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [jump, move]);

  const particles = useMemo(() => Array.from({ length: 25 }, (_, index) => ({
    left: `${5 + (index * 31) % 91}%`, top: `${16 + (index * 47) % 72}%`, delay: `${index * -.17}s`,
  })), []);
  const label = world === "CASTLE" ? "Castle Quest" : world === "TEMPLE" ? "Temple Adventure" : "Forest Adventure";
  const progress = Math.round((questionIndex / Math.max(questionCount, 1)) * 100);

  return <div className={`adventure-game-world world-${world.toLowerCase()} ${selected ? "checkpoint-unlocking" : ""}`}>
    <div className="adventure-environment" aria-hidden="true">
      <div className="adventure-daylight" /><div className="adventure-clouds"><i /><i /><i /></div>
      <div className="adventure-landscape" /><div className="adventure-water"><i /></div>
      <div className="adventure-architecture"><i /><i /><i /><i /></div>
      <div className="adventure-nature">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
      <div className="adventure-wildlife">🦋　🕊️　🦌</div>
      <div className="adventure-magic">{particles.map((particle, index) => <i key={index} style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }} />)}</div>
    </div>

    {/* HUD Elements */}
    <div className="adventure-world-hud">
      <div className="hud-pill"><Map /><span><small>World</small><b>{label}</b></span></div>
      <div className="hud-pill"><KeyRound /><span><small>Mission</small><b>{questionIndex + 1} / {questionCount}</b></span></div>
      <div className="hud-pill"><Gem /><span><small>Collected</small><b>{questionIndex}</b></span></div>
    </div>

    {/* Question Display Card */}
    <section className="adventure-world-question">
      <span><Sparkles /> Mission checkpoint {questionIndex + 1}</span>
      <h1>{question.questionText}</h1>
      {question.imageUrl && <img src={question.imageUrl} alt="" />}
    </section>

    {/* Real-time Stage Area */}
    <div className="adventure-world-stage">
      <div className="adventure-path" aria-hidden="true"><i /><i /></div>
      
      {/* Map Collectables (Coins & Stars) */}
      {items.map((item) => {
        if (item.collected) return null;
        return (
          <div
            key={item.id}
            className={`map-collectable collectable-${item.type} ${item.isFloating ? "is-floating" : ""}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <span>{item.type === "coin" ? "🪙" : "⭐"}</span>
          </div>
        );
      })}

      {options.map((option, index) => {
        const key = option.id || option.optionKey || `${question.id}-${index}`;
        const target = checkpoints[index % checkpoints.length];
        return <button key={key} type="button" disabled={busy} onClick={() => void choose(option, index)}
          className={`adventure-checkpoint checkpoint-${index + 1} ${selected === key ? "is-unlocking" : selected ? "is-departing" : ""}`}
          style={{ left: `${target.x}%`, top: `${target.y}%` }} aria-label={`Travel to ${option.optionText}`}>
          <div className="checkpoint-badge">
            <span>{world === "CASTLE" ? "🚪" : world === "TEMPLE" ? "🗿" : "🌳"}</span>
          </div>
          {option.imageUrl && <img src={option.imageUrl} alt="" />}
          <strong>{option.optionText}</strong><small>Travel here</small>
        </button>;
      })}
      
      {/* Player character token */}
      <div className={`adventure-player ${running ? "is-running" : ""} ${jumping ? "is-jumping" : ""}`} style={{ left: `${player.x}%`, top: `${player.y}%` }}>
        <div className="player-avatar-ring">
          <span>🧒</span><em>🎒</em>
        </div>
        <i className="player-avatar-shadow" />
      </div>
      
      {selected && <div className="adventure-confetti">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ "--piece": index } as React.CSSProperties} />)}</div>}
    </div>

    {/* Circular Arcade Console D-Pad */}
    <div className="adventure-controls">
      <button onClick={() => move(0, -6)} disabled={busy} aria-label="Move up" className="control-btn control-up"><ArrowUp /></button>
      <button onClick={() => move(-6, 0)} disabled={busy} aria-label="Move left" className="control-btn control-left"><ArrowLeft /></button>
      <button onClick={jump} disabled={busy} aria-label="Jump" className="control-btn control-jump"><Star /></button>
      <button onClick={() => move(6, 0)} disabled={busy} aria-label="Move right" className="control-btn control-right"><ArrowRight /></button>
      <button onClick={() => move(0, 6)} disabled={busy} aria-label="Move down" className="control-btn control-down"><ArrowDown /></button>
    </div>
    
    <div className="adventure-world-progress"><i style={{ width: `${progress}%` }} /><Coins /></div>
  </div>;
}

function adventureWorld(configuration: Record<string, unknown> | undefined, index: number): World {
  const configured = String(configuration?.adventureType || configuration?.world || configuration?.gameType || "").toUpperCase();
  if (configured.includes("CASTLE")) return "CASTLE";
  if (configured.includes("TEMPLE")) return "TEMPLE";
  if (configured.includes("FOREST")) return "FOREST";
  return (["FOREST", "CASTLE", "TEMPLE"] as const)[index % 3];
}
