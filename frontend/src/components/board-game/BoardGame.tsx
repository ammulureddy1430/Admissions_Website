"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Crown, Gem, KeyRound, Map, Save, Sparkles, Star } from "lucide-react";
import "./BoardGame.css";

type BoardOption = { id?: string; optionKey?: string; optionText: string; imageUrl?: string | null };
type BoardQuestion = { id: string; questionText: string; options?: BoardOption[]; imageUrl?: string | null; difficulty?: string };
type Theme = { id: string; name: string; character: string; npc: string; accent: string };

const tileIcons = ["⭐","🪙","💎","🌉","🗝️","🎁","🌀","⚡","🛡️","🎲","🌊","🔥","🪜","🐍","🏆","❓"];

export function BoardGame({ question, questionIndex, questionCount, configuration, disabled, sound, onAnswer }: {
  question: BoardQuestion;
  questionIndex: number;
  questionCount: number;
  configuration?: Record<string, unknown>;
  disabled: boolean;
  sound: boolean;
  onAnswer: (answer: string) => Promise<unknown> | unknown;
}) {
  const theme = boardTheme(configuration, question.id, questionIndex);
  const options = useMemo(() => question.options || [], [question.options]);
  const tileCount = question.difficulty === "HARD" ? 24 : question.difficulty === "EASY" ? 14 : 18;
  const [position, setPosition] = useState(0);
  const [die, setDie] = useState(1);
  const [phase, setPhase] = useState<"ready" | "rolling" | "walking" | "encounter" | "departing">("ready");
  const [selected, setSelected] = useState("");
  const [coins, setCoins] = useState(questionIndex * 3);
  const [keys, setKeys] = useState(Math.floor(questionIndex / 2));
  const [stars, setStars] = useState(questionIndex);
  const [targetTile, setTargetTile] = useState(0);
  const [rollCount, setRollCount] = useState(0);
  const busy = disabled || phase === "rolling" || phase === "walking" || phase === "departing";

  useEffect(() => {
    // A new question intentionally resets the complete board journey.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPosition(0); setDie(1); setPhase("ready"); setSelected(""); setRollCount(0);
    setCoins(questionIndex * 3); setKeys(Math.floor(questionIndex / 2)); setStars(questionIndex);
    
    // Keep every encounter reachable in one or two rolls.
    const minTile = 3;
    const maxTile = Math.min(6, tileCount - 2);
    const randomTarget = Math.floor(Math.random() * (maxTile - minTile + 1)) + minTile;
    setTargetTile(randomTarget);
  }, [question.id, questionIndex, tileCount]);

  const play = useCallback((frequency: number, duration = .08) => {
    if (!sound) return;
    try {
      const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const context = new Context(), oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {}
  }, [sound]);

  const roll = useCallback(async () => {
    if (busy || phase !== "ready") return;
    setPhase("rolling"); play(210, .3);
    
    const remainingDistance = targetTile - position;
    const nextRoll = rollCount + 1;
    // The first roll is random. The second always completes the short journey.
    const final = nextRoll >= 2
      ? Math.max(1, Math.min(6, remainingDistance))
      : Math.floor(Math.random() * 6) + 1;
    
    for (let spin = 0; spin < 10; spin += 1) {
      setDie(Math.floor(Math.random() * 6) + 1);
      await new Promise(resolve => window.setTimeout(resolve, 65));
    }
    setDie(final);
    setRollCount(nextRoll);

    setPhase("walking");
    const destination = Math.min(targetTile, position + final);
    for (let step = position + 1; step <= destination; step += 1) {
      await new Promise(resolve => window.setTimeout(resolve, 210));
      setPosition(step); play(270 + step * 7, .04);
      const icon = tileIcons[(step + questionIndex) % tileIcons.length];
      if (icon === "🪙") setCoins(value => value + 2);
      if (icon === "🗝️") setKeys(value => value + 1);
      if (icon === "⭐") setStars(value => value + 1);
    }

    if (destination === targetTile) {
      setPhase("encounter"); play(620, .16);
    } else {
      setPhase("ready");
    }
  }, [busy, phase, play, position, questionIndex, rollCount, targetTile]);

  const choose = useCallback((option: BoardOption, index: number) => {
    if (phase !== "encounter" || disabled || selected) return;
    const key = option.id || option.optionKey || `${question.id}-${index}`;
    setSelected(key); setPhase("departing"); setCoins(value => value + 3); play(760, .2);
    void onAnswer(option.optionText);
  }, [disabled, onAnswer, phase, play, question.id, selected]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.key === " " || event.key === "Enter") && phase === "ready") { event.preventDefault(); void roll(); }
      const number = Number(event.key);
      if (phase === "encounter" && number >= 1 && number <= options.length) choose(options[number - 1], number - 1);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [choose, options, phase, roll]);

  const tiles = useMemo(() => Array.from({ length: tileCount }, (_, index) => ({
    index,
    icon: index === 0 ? "🏁" : index === targetTile ? `Q${questionIndex + 1}` : index === tileCount - 1 ? "🏰" : tileIcons[(index + questionIndex) % tileIcons.length],
    x: boardPoint(index, tileCount).x, y: boardPoint(index, tileCount).y,
  })), [questionIndex, tileCount, targetTile]);
  const playerPoint = boardPoint(position, tileCount);
  const boardProgress = Math.round(((questionIndex + (phase === "departing" ? 1 : 0)) / Math.max(questionCount, 1)) * 100);

  return <div className={`board-game-v2 board-theme-${theme.id} phase-${phase}`} style={{ "--board-accent": theme.accent } as React.CSSProperties}>
    <div className="board-v2-world" aria-hidden="true">
      <div className="board-v2-sky"><i /><i /><i /></div><div className="board-v2-landscape" />
      <div className="board-v2-water" /><div className="board-v2-castle">🏰</div>
      <div className="board-v2-nature">🌲　🌴　🌳　🌲　🌴</div><div className="board-v2-particles">{Array.from({ length: 22 }, (_, index) => <i key={index} />)}</div>
    </div>

    <div className="board-v2-hud">
      <div><Map /><span><small>World</small><b>{theme.name}</b></span></div>
      <div><Coins /><span><small>Coins</small><b>{coins}</b></span></div>
      <div><KeyRound /><span><small>Keys</small><b>{keys}</b></span></div>
      <div><Star /><span><small>Stars</small><b>{stars}</b></span></div>
    </div>

    <div className="board-v2-mission">
      <span><Crown /> Journey {questionIndex + 1} of {questionCount}</span>
      <b>
        {phase === "encounter"
          ? "A board guardian has appeared"
          : rollCount === 0
            ? "Reach the question in one or two dice rolls"
            : "Final roll will land on the question"}
      </b>
    </div>

    <div className="board-v2-camera" style={{ "--camera-x": `${50 - playerPoint.x}%`, "--camera-y": `${50 - playerPoint.y}%` } as React.CSSProperties}>
      <div className="board-v2-route" aria-label="Winding adventure board">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><path d={boardPath(tileCount)} /></svg>
        {tiles.map(tile => <div key={tile.index} className={`board-v2-tile ${tile.index === position ? "is-current" : ""} ${tile.index < position ? "is-visited" : ""} ${tile.index === targetTile ? "is-target" : ""}`} style={{ left: `${tile.x}%`, top: `${tile.y}%` }}><span>{tile.icon}</span><b>{tile.index + 1}</b></div>)}
        <div className={`board-v2-player ${phase === "walking" ? "is-walking" : ""} ${phase === "departing" ? "is-celebrating" : ""}`} style={{ left: `${playerPoint.x}%`, top: `${playerPoint.y}%` }}><span>{theme.character}</span><i /></div>
      </div>
    </div>

    {phase === "encounter" && <section className="board-v2-encounter">
      <div className="board-v2-npc"><span>{theme.npc}</span><i /></div>
      <div className="board-v2-dialogue">
        <span><Sparkles /> Guardian encounter</span>
        <h1>{question.questionText}</h1>
        {question.imageUrl && <img src={question.imageUrl} alt="" />}
        <div>{options.map((option, index) => {
          const key = option.id || option.optionKey || `${question.id}-${index}`;
          return <button key={key} disabled={!!selected} onClick={() => choose(option, index)} className={selected === key ? "is-chosen" : selected ? "is-faded" : ""}><em>{index + 1}</em>{option.imageUrl && <img src={option.imageUrl} alt="" />}<b>{option.optionText}</b></button>;
        })}</div>
      </div>
    </section>}

    <div className={`board-v2-dice ${phase === "rolling" ? "is-rolling" : ""}`}>
      <button type="button" onClick={() => void roll()} disabled={busy || phase !== "ready"} aria-label="Roll dice"><span className={`dice-face dice-${die}`}>{die}</span><b>{phase === "rolling" ? "Rolling…" : phase === "ready" ? `Roll ${Math.min(rollCount + 1, 2)} of 2` : "Moving"}</b></button>
    </div>
    <div className="board-v2-footer"><span><Save /> Autosaved</span><div><i style={{ width: `${boardProgress}%` }} /></div><b>{questionCount - questionIndex} encounters remaining</b></div>
    {phase === "departing" && <div className="board-v2-reward"><Gem /><span>Treasure collected</span>{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ "--reward-piece": index } as React.CSSProperties} />)}</div>}
  </div>;
}

function boardPoint(index: number, count: number) {
  const rowSize = 6, row = Math.floor(index / rowSize), inRow = index % rowSize;
  const usableRows = Math.ceil(count / rowSize);
  const x = row % 2 === 0 ? 12 + inRow * 15 : 87 - inRow * 15;
  const y = usableRows <= 1 ? 50 : 17 + row * (66 / Math.max(1, usableRows - 1));
  return { x, y };
}
function boardPath(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const point = boardPoint(index, count);
    return `${index ? "L" : "M"} ${point.x} ${point.y}`;
  }).join(" ");
}
function boardTheme(configuration: Record<string, unknown> | undefined, id: string, index: number): Theme {
  const themes: Theme[] = [
    {id:"island",name:"Treasure Island",character:"🧭",npc:"🏴‍☠️",accent:"#ffd35e"},
    {id:"kingdom",name:"Fantasy Kingdom",character:"🧙",npc:"🧝",accent:"#bd91ff"},
    {id:"space",name:"Space Galaxy",character:"🧑‍🚀",npc:"🤖",accent:"#71eaff"},
    {id:"volcano",name:"Volcano Escape",character:"🧗",npc:"🗿",accent:"#ff8a5c"},
    {id:"jungle",name:"Jungle Adventure",character:"🧑‍🌾",npc:"🦁",accent:"#79e675"},
    {id:"ice",name:"Ice Kingdom",character:"🤺",npc:"⛄",accent:"#a6efff"},
    {id:"ocean",name:"Ocean World",character:"🧜",npc:"🐙",accent:"#64eadc"},
    {id:"candy",name:"Candy Land",character:"🧚",npc:"🍭",accent:"#ff94c9"},
  ];
  const configured = String(configuration?.boardTheme || configuration?.gameType || "").toLowerCase();
  return themes.find(theme => configured.includes(theme.id)) || themes[([...id].reduce((sum, char) => sum + char.charCodeAt(0), index) + index) % themes.length];
}
