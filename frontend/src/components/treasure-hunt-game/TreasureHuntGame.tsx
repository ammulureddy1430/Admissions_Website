"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Gem, KeyRound, Map, Search, Shovel, Sparkles } from "lucide-react";
import "./TreasureHuntGame.css";

type TreasureOption = { id?: string; optionKey?: string; optionText: string; imageUrl?: string | null };
type TreasureQuestion = { id: string; questionText: string; options?: TreasureOption[]; imageUrl?: string | null };
type HuntMode = "ISLAND_DIG" | "PIRATE_MAP" | "RELIC_SEARCH";

const sites = [{ x: 18, y: 31 }, { x: 75, y: 27 }, { x: 27, y: 72 }, { x: 77, y: 69 }];

export function TreasureHuntGame({ question, questionIndex, questionCount, configuration, disabled, sound, onAnswer }: {
  question: TreasureQuestion;
  questionIndex: number;
  questionCount: number;
  configuration?: Record<string, unknown>;
  disabled: boolean;
  sound: boolean;
  onAnswer: (answer: string) => Promise<unknown> | unknown;
}) {
  const mode = huntMode(configuration, questionIndex);
  const options = useMemo(() => question.options || [], [question.options]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [scanner, setScanner] = useState(0);
  const busy = disabled || !!selected;

  const play = useCallback((frequency: number, duration = .1) => {
    if (!sound || typeof window === "undefined") return;
    try {
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const context = new Context(), oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {}
  }, [sound]);

  useEffect(() => {
    // Each new map piece starts with a fresh expedition state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevealed([]);
    setSelected("");
    setScanner(0);
  }, [question.id]);

  const discover = useCallback((option: TreasureOption | undefined, index: number) => {
    if (busy || !option) return;
    const key = option.id || option.optionKey || `${question.id}-${index}`;
    if (revealed.includes(key)) {
      setSelected(key);
      play(760, .2);
      void onAnswer(option.optionText);
      return;
    }
    setRevealed(current => [...current, key]);
    setScanner(options.length ? (index + 1) % options.length : 0);
    play(430 + index * 65, .13);
  }, [busy, onAnswer, options.length, play, question.id, revealed]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.repeat || busy || !options.length) return;
      const key = event.key.toLowerCase();
      if (["arrowright", "arrowdown", "d", "s"].includes(key)) setScanner(current => (current + 1) % options.length);
      if (["arrowleft", "arrowup", "a", "w"].includes(key)) setScanner(current => (current - 1 + options.length) % options.length);
      if (key === "enter" || key === " ") {
        const safeIndex = scanner >= 0 && scanner < options.length ? scanner : 0;
        discover(options[safeIndex], safeIndex);
      }
      if (key.startsWith("arrow") || ["w", "a", "s", "d", "enter", " "].includes(key)) event.preventDefault();
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [busy, discover, options, scanner]);

  const particles = useMemo(() => Array.from({ length: 22 }, (_, index) => ({
    left: `${4 + (index * 37) % 93}%`, top: `${13 + (index * 43) % 78}%`, delay: `${index * -.19}s`,
  })), []);
  const label = mode === "PIRATE_MAP" ? "Pirate Map Trail" : mode === "RELIC_SEARCH" ? "Hidden Relic Search" : "Treasure Island Dig";
  const action = mode === "RELIC_SEARCH" ? "Inspect" : mode === "PIRATE_MAP" ? "Decode" : "Dig";
  const progress = Math.round((questionIndex / Math.max(1, questionCount)) * 100);
  const focusedOption = options[scanner];
  const focusedKey = focusedOption
    ? focusedOption.id || focusedOption.optionKey || `${question.id}-${scanner}`
    : "";
  const focusedIsRevealed = revealed.includes(focusedKey);
  const moveScanner = (direction: -1 | 1) => {
    if (busy || !options.length) return;
    setScanner(current => (current + direction + options.length) % options.length);
  };
  const activateFocusedSite = () => {
    if (busy || !focusedOption) return;
    discover(focusedOption, scanner);
  };

  return <div className={`treasure-dig-game hunt-${mode.toLowerCase()}`}>
    <div className="treasure-dig-world" aria-hidden="true">
      <div className="treasure-ocean" /><div className="treasure-dig-island" />
      <div className="treasure-dig-palms">🌴　🌴</div><div className="treasure-dig-ship">⛵</div>
      <div className="treasure-dig-waterfall" /><div className="treasure-dig-ruins">🏛️</div>
      <div className="treasure-dig-sparkles">{particles.map((particle, index) => <i key={index} style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }} />)}</div>
    </div>

    <div className="treasure-dig-hud">
      <div><Compass /><span><small>Expedition</small><b>{label}</b></span></div>
      <div><KeyRound /><span><small>Map piece</small><b>{questionIndex + 1} / {questionCount}</b></span></div>
      <div><Gem /><span><small>Discovered</small><b>{revealed.length} / {options.length}</b></span></div>
    </div>

    <div className={`treasure-current-objective ${focusedIsRevealed ? "is-ready" : ""}`}>
      <span>{focusedIsRevealed ? "2" : "1"}</span>
      <div><small>Current objective</small><b>{focusedIsRevealed ? "Open the discovered chest" : `Choose a site and ${action.toLowerCase()}`}</b></div>
      <i>{focusedIsRevealed ? "🏆" : "🧭"}</i>
    </div>

    <aside className="treasure-mission-scroll">
      <div><Map /><span>Captain&apos;s map</span></div>
      <h1>{question.questionText}</h1>
      {question.imageUrl && <img src={question.imageUrl} alt="" />}
      <p>Search the marked ground. Dig once to reveal an artifact, then open it to continue.</p>
      <div className="treasure-scroll-steps">
        <span className={!revealed.length ? "is-active" : "is-done"}><b>1</b> Find</span><i />
        <span className={revealed.length ? "is-active" : ""}><b>2</b> Open</span>
      </div>
    </aside>

    <div className="treasure-dig-field" role="group" aria-label="Hidden treasure locations">
      <div className="treasure-map-route" aria-hidden="true"><i /><i /><i /></div>
      {options.map((option, index) => {
        const key = option.id || option.optionKey || `${question.id}-${index}`;
        const isRevealed = revealed.includes(key);
        const position = sites[index % sites.length];
        return <button key={key} type="button" disabled={busy} onClick={() => discover(option, index)}
          className={`treasure-dig-site ${scanner === index ? "is-scanned" : ""} ${isRevealed ? "is-revealed" : ""} ${selected === key ? "is-collected" : selected ? "is-faded" : ""}`}
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
          aria-label={isRevealed ? `Open discovered treasure ${option.optionText}` : `${action} hidden location ${index + 1}`}>
          {scanner === index && <span className="treasure-selected-indicator">Current choice</span>}
          <span className="treasure-site-number">{isRevealed ? "FOUND" : `SITE ${index + 1}`}</span>
          <span className="treasure-dig-marker">{isRevealed ? <span className="treasure-found-chest">🧰</span> : <><Shovel /><b>×</b></>}</span>
          {isRevealed ? <span className="treasure-discovered-answer">
            {option.imageUrl && <img src={option.imageUrl} alt="" />}
            <strong>{option.optionText}</strong><small>Open treasure</small>
          </span> : <span className="treasure-hidden-label"><Search /><strong>{action} site {index + 1}</strong><small>Artifact hidden</small></span>}
          <span className="treasure-radar" aria-hidden />
        </button>;
      })}
      {selected && <div className="treasure-dig-burst" aria-hidden>{Array.from({ length: 30 }, (_, index) => <i key={index} style={{ "--treasure-piece": index } as React.CSSProperties} />)}</div>}
    </div>

    <div className="treasure-game-controls" aria-label="Treasure hunt controls">
      <button type="button" onClick={() => moveScanner(-1)} disabled={busy || options.length < 2} aria-label="Previous treasure site">
        <ChevronLeft />
        <span>Previous</span>
      </button>
      <button type="button" className="treasure-primary-control" onClick={activateFocusedSite} disabled={busy || !focusedOption}>
        {focusedIsRevealed ? <Gem /> : <Shovel />}
        <span>{focusedIsRevealed ? "Open chest" : `${action} site ${scanner + 1}`}</span>
      </button>
      <button type="button" onClick={() => moveScanner(1)} disabled={busy || options.length < 2} aria-label="Next treasure site">
        <span>Next</span>
        <ChevronRight />
      </button>
      <small><Sparkles /> You can also click a site or use Arrow keys + Enter</small>
    </div>
    <div className="treasure-dig-progress"><i style={{ width: `${progress}%` }} /></div>
  </div>;
}

function huntMode(configuration: Record<string, unknown> | undefined, index: number): HuntMode {
  const value = String(configuration?.treasureType || configuration?.huntMode || configuration?.gameType || "").toUpperCase();
  if (value.includes("PIRATE") || value.includes("MAP")) return "PIRATE_MAP";
  if (value.includes("RELIC") || value.includes("HIDDEN")) return "RELIC_SEARCH";
  if (value.includes("ISLAND") || value.includes("DIG")) return "ISLAND_DIG";
  return (["ISLAND_DIG", "PIRATE_MAP", "RELIC_SEARCH"] as const)[index % 3];
}
