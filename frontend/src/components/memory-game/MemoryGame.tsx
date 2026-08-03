"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Clock3, GripVertical, Layers3, RotateCcw, Sparkles } from "lucide-react";

type MemoryItem = { id: string; text?: string; face?: string; imageUrl?: string | null; optionKey?: string; pairId?: string; kind?: string };
type MemoryPresentation = {
  type: "CARD_FLIP" | "SEQUENCE" | "OBJECT_MEMORY";
  previewSeconds: number;
  cards?: MemoryItem[];
  sequence?: MemoryItem[];
  shown?: MemoryItem[];
  objects?: MemoryItem[];
  pairCount?: number;
};

export function MemoryGame({
  question,
  questionIndex,
  questionCount,
  disabled,
  sound,
  onComplete,
}: {
  question: { id: string; questionText: string; difficulty: string; memory: MemoryPresentation };
  questionIndex: number;
  questionCount: number;
  disabled: boolean;
  sound: boolean;
  onComplete: (response: Record<string, unknown>) => Promise<unknown>;
}) {
  const presentation = question.memory;
  const [phase, setPhase] = useState<"preview" | "play" | "celebrate">("preview");
  const [previewSeconds, setPreviewSeconds] = useState(presentation.previewSeconds);
  const [ordered, setOrdered] = useState<MemoryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [ripple, setRipple] = useState("");
  const startedAt = useRef(0);

  const shuffledSequence = useMemo(() => {
    const items = [...(presentation.sequence || [])];
    return items.sort((a, b) => `${question.id}-${b.id}`.localeCompare(`${question.id}-${a.id}`));
  }, [presentation.sequence, question.id]);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [question.id]);

  useEffect(() => {
    if (phase !== "preview") return;
    const timer = window.setTimeout(() => {
      if (previewSeconds <= 1) {
        setPreviewSeconds(0);
        setPhase("play");
      } else {
        setPreviewSeconds((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, previewSeconds]);

  const tone = useCallback((frequency: number) => {
    if (!sound) return;
    try {
      const AudioContext = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = frequency; gain.gain.value = 0.045;
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.1);
    } catch {}
  }, [sound]);

  const finish = useCallback(async (response: Record<string, unknown>) => {
    if (busy || disabled) return;
    setBusy(true); setPhase("celebrate"); tone(760);
    await new Promise((resolve) => window.setTimeout(resolve, 720));
    await onComplete({ response, timeTaken: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)) });
  }, [busy, disabled, onComplete, tone]);

  const selectHiddenAnswer = (card: MemoryItem) => {
    if (disabled || busy) return;
    setRipple(card.id); tone(420);
    void finish({ selectedOptionId: card.id, answer: card.face });
  };

  const addSequenceItem = (item: MemoryItem) => {
    if (ordered.some((entry) => entry.id === item.id) || disabled || busy) return;
    tone(390); setOrdered((current) => [...current, item]);
  };
  const removeSequenceItem = (item: MemoryItem) => setOrdered((current) => current.filter((entry) => entry.id !== item.id));
  const checkSequence = () => {
    const expected = (presentation.sequence || []).map((item) => item.id).join("|");
    if (ordered.map((item) => item.id).join("|") === expected) void finish({ orderedIds: ordered.map((item) => item.id) });
    else { setOrdered([]); tone(180); }
  };
  const checkObjects = () => {
    const expected = (presentation.shown || []).map((item) => item.id).sort().join("|");
    if ([...selected].sort().join("|") === expected) void finish({ selectedIds: selected });
    else { setSelected([]); tone(180); }
  };

  return <div className={`memory-game memory-${presentation.type.toLowerCase()} phase-${phase}`}>
    <div className="memory-floaters" aria-hidden><i /><i /><i /><i /></div>
    <header className="memory-heading">
      <div><span><Brain /> Memory challenge {questionIndex + 1} of {questionCount}</span><h1>{question.questionText}</h1></div>
      <div className="memory-stage-pill"><Layers3 /><b>{presentation.type === "CARD_FLIP" ? "Remember each answer position" : presentation.type === "SEQUENCE" ? "Remember the sequence" : "Remember the objects"}</b></div>
    </header>

    {phase === "preview" && <section className="memory-preview">
      <div className="memory-countdown"><Clock3 /><b>{previewSeconds}</b><span>Memorize</span></div>
      <div className="memory-preview-items">
        {(presentation.type === "CARD_FLIP" ? presentation.cards : presentation.type === "SEQUENCE" ? presentation.sequence : presentation.shown)?.map((item, index) => <div key={item.id} style={{ "--memory-index": index } as React.CSSProperties}><span>{item.optionKey || index + 1}</span>{item.imageUrl && <img src={item.imageUrl} alt="" />}<b>{item.face || item.text}</b></div>)}
      </div>
    </section>}

    {phase === "play" && presentation.type === "CARD_FLIP" && <section className="memory-card-grid" aria-label="Memory flip cards">
      <div className="memory-recall-banner">
        <span><Brain /> Recall phase</span>
        <b>Where was the best answer?</b>
        <small>Choose one remembered position</small>
      </div>
      {presentation.cards?.map((card) => {
        return <button type="button" key={card.id} onClick={() => selectHiddenAnswer(card)} disabled={disabled || busy} className="memory-flip-card">
          <span className="memory-card-inner"><span className="memory-card-back"><small>Position</small><b>{card.optionKey}</b><Brain /><em>Tap to choose</em></span><span className="memory-card-front">{card.imageUrl && <img src={card.imageUrl} alt="" />}{card.face}</span></span>
          {ripple === card.id && <i className="memory-ripple" />}
        </button>;
      })}
    </section>}

    {phase === "play" && presentation.type === "SEQUENCE" && <section className="memory-sequence-play">
      <div className="memory-sequence-slots">
        {Array.from({ length: presentation.sequence?.length || 0 }, (_, index) => {
          const item = ordered[index];
          return <button type="button" key={index} onClick={() => item && removeSequenceItem(item)} className={item ? "has-item" : ""}><span>{index + 1}</span>{item ? <b>{item.text}</b> : <i />}</button>;
        })}
      </div>
      <div className="memory-item-tray">{shuffledSequence.map((item) => <button type="button" key={item.id} onClick={() => addSequenceItem(item)} disabled={ordered.some((entry) => entry.id === item.id)}><GripVertical />{item.imageUrl && <img src={item.imageUrl} alt="" />}<span>{item.text}</span></button>)}</div>
      <div className="memory-actions"><button type="button" onClick={() => setOrdered([])}><RotateCcw /> Reset</button><button type="button" onClick={checkSequence} disabled={ordered.length !== presentation.sequence?.length}>Lock sequence</button></div>
    </section>}

    {phase === "play" && presentation.type === "OBJECT_MEMORY" && <section className="memory-object-play">
      <div className="memory-object-cloud">{presentation.objects?.map((item, index) => {
        const active = selected.includes(item.id);
        return <button type="button" key={item.id} onClick={() => setSelected((current) => active ? current.filter((id) => id !== item.id) : [...current, item.id])} className={active ? "is-selected" : ""} style={{ "--memory-index": index } as React.CSSProperties}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Sparkles />}<span>{item.text}</span></button>;
      })}</div>
      <div className="memory-actions"><button type="button" onClick={() => setSelected([])}><RotateCcw /> Clear</button><button type="button" onClick={checkObjects} disabled={!selected.length}>Lock objects</button></div>
    </section>}

    {phase === "celebrate" && <div className="memory-celebration"><div>{Array.from({ length: 22 }, (_, index) => <i key={index} style={{ "--memory-index": index } as React.CSSProperties} />)}</div><Sparkles /><h2>Challenge complete</h2></div>}
  </div>;
}
