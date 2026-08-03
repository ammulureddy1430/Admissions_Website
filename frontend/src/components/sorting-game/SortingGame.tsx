"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Coins, Factory, Gauge, Gem, GripVertical, PackageCheck, Sparkles, Truck, Warehouse } from "lucide-react";
import "./SortingGame.css";

type SortOption = { id?: string; optionKey?: string; optionText: string; imageUrl?: string | null };
type SortQuestion = { id: string; questionText: string; options?: SortOption[]; imageUrl?: string | null };
type GroupKey = "MISSION" | "STORAGE";
type SortMode = "RECYCLING" | "WAREHOUSE" | "TREASURE" | "AIRPORT" | "FARM" | "SPACE" | "POTION" | "TOY";

export function SortingGame({ question, questionIndex, questionCount, configuration, disabled, sound, onAnswer }: {
  question: SortQuestion;
  questionIndex: number;
  questionCount: number;
  configuration?: Record<string, unknown>;
  disabled: boolean;
  sound: boolean;
  onAnswer: (answer: string) => Promise<unknown> | unknown;
}) {
  const options = useMemo(() => question.options || [], [question.options]);
  const mode = sortingMode(configuration, questionIndex);
  const labels = modeLabels(mode);
  const [placements, setPlacements] = useState<Record<string, GroupKey>>({});
  const [selected, setSelected] = useState("");
  const [dragging, setDragging] = useState("");
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [activeGroup, setActiveGroup] = useState<GroupKey | "">("");
  const [phase, setPhase] = useState<"arrival" | "working" | "shipping" | "celebrate">("arrival");
  const [combo, setCombo] = useState(0);
  const submitted = useRef(false);
  const onAnswerRef = useRef(onAnswer);

  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  useEffect(() => {
    // A new question intentionally resets the complete workstation state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacements({}); setSelected(""); setDragging(""); setActiveGroup(""); setCombo(0);
    setPhase("arrival"); submitted.current = false;
    const timer = window.setTimeout(() => setPhase("working"), 500);
    return () => window.clearTimeout(timer);
  }, [question.id]);

  const play = useCallback((frequency: number, duration = .09) => {
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

  const route = useCallback((key: string, group: GroupKey) => {
    if (disabled || phase !== "working") return;
    setPlacements(current => {
      const next = { ...current };
      if (group === "MISSION") Object.keys(next).forEach(existing => { if (next[existing] === "MISSION" && existing !== key) next[existing] = "STORAGE"; });
      next[key] = group;
      return next;
    });
    setSelected(""); setDragging(""); setActiveGroup(""); setCombo(value => value + 1);
    play(group === "MISSION" ? 650 : 390);
  }, [disabled, phase, play]);

  useEffect(() => {
    const keys = options.map(optionKey);
    const allRouted = keys.length > 0 && keys.every(key => placements[key]);
    const missionKey = keys.find(key => placements[key] === "MISSION");
    if (!allRouted || !missionKey || submitted.current) return;
    const answer = options.find(option => optionKey(option) === missionKey);
    if (!answer) return;
    submitted.current = true;
    const final = questionIndex + 1 === questionCount;
    // Completion changes the visible workstation phase before submitting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(final ? "celebrate" : "shipping");
    void onAnswerRef.current(answer.optionText);
  }, [options, placements, questionCount, questionIndex]);

  const groupAtPoint = (x: number, y: number) => {
    const value = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-sort-dock]")?.dataset.sortDock;
    return value === "MISSION" || value === "STORAGE" ? value : "";
  };
  const startDrag = (event: React.PointerEvent, key: string) => {
    if (disabled || phase !== "working") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(key); setSelected(key); setPointer({ x: event.clientX, y: event.clientY }); play(230);
  };
  const moveDrag = (event: React.PointerEvent) => {
    if (!dragging) return;
    setPointer({ x: event.clientX, y: event.clientY });
    setActiveGroup(groupAtPoint(event.clientX, event.clientY));
  };
  const endDrag = (event: React.PointerEvent) => {
    if (!dragging) return;
    const group = groupAtPoint(event.clientX, event.clientY);
    if (group) route(dragging, group); else { setDragging(""); setActiveGroup(""); }
  };

  const unrouted = options.filter(option => !placements[optionKey(option)]);
  const mission = options.filter(option => placements[optionKey(option)] === "MISSION");
  const storage = options.filter(option => placements[optionKey(option)] === "STORAGE");
  const current = selected || (unrouted[0] ? optionKey(unrouted[0]) : "");
  const progress = options.length ? Math.round(((mission.length + storage.length) / options.length) * 100) : 0;

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (disabled || phase !== "working" || !current) return;
      const key = event.key.toLowerCase();
      if (key === "a" || key === "arrowleft") route(current, "STORAGE");
      if (key === "d" || key === "arrowright") route(current, "MISSION");
      if (["a", "d", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [current, disabled, phase, route]);

  return <div className={`sorting-sim sort-mode-${mode.toLowerCase()} phase-${phase}`}>
    <div className="sorting-sim-world" aria-hidden="true">
      <div className="sorting-sim-lights"><i /><i /><i /></div>
      <div className="sorting-sim-machinery"><i /><i /><i /><i /></div>
      <div className="sorting-sim-smoke"><i /><i /><i /></div>
    </div>

    <div className="sorting-sim-hud">
      <div><Factory /><span><small>Workstation</small><b>{labels.name}</b></span></div>
      <div><Gauge /><span><small>Mission</small><b>{questionIndex + 1} / {questionCount}</b></span></div>
      <div><Coins /><span><small>Combo</small><b>×{combo}</b></span></div>
    </div>

    <section className="sorting-sim-mission">
      <span><Sparkles /> {labels.mission}</span>
      <h1>{question.questionText}</h1>
      {question.imageUrl && <img src={question.imageUrl} alt="" />}
      <p>Route every moving object. Send one object to the mission station and the rest to storage.</p>
      <div className="sorting-how-to"><span><b>1</b>Select an option</span><i /><span><b>2</b>Send your choice to <strong>MY ANSWER</strong></span><i /><span><b>3</b>Send the rest to <strong>OTHER CHOICES</strong></span></div>
    </section>

    <div className="sorting-conveyor-zone">
      <div className="sorting-conveyor">
        <div className="sorting-conveyor-belt">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
        <div className="sorting-conveyor-objects">
          {unrouted.map((option, index) => {
            const key = optionKey(option);
            return <button key={key} type="button" disabled={disabled || phase !== "working"}
              onClick={() => setSelected(currentKey => currentKey === key ? "" : key)}
              onPointerDown={event => startDrag(event, key)} onPointerMove={moveDrag} onPointerUp={endDrag}
              onPointerCancel={() => { setDragging(""); setActiveGroup(""); }}
              className={`${selected === key ? "is-active" : ""} ${dragging === key ? "is-dragging" : ""}`}
              style={{ "--cargo-index": index } as React.CSSProperties}>
              <span>{labels.object}</span>{option.imageUrl && <img src={option.imageUrl} alt="" />}
              <b>{option.optionText}</b><GripVertical />
            </button>;
          })}
          {!unrouted.length && <div className="sorting-conveyor-empty"><Truck /> Shipment routed</div>}
        </div>
      </div>

      <div className="sorting-routing-docks">
        <SortingDock group="STORAGE" label="Other choices" description="Options you are not selecting" icon={<Warehouse />} items={storage} selected={current} active={activeGroup === "STORAGE"} onRoute={route} />
        <div className="sorting-router-core"><Boxes /><i /><span>Router</span></div>
        <SortingDock group="MISSION" label="My answer" description="Place exactly one option here" icon={<PackageCheck />} items={mission} selected={current} active={activeGroup === "MISSION"} onRoute={route} />
      </div>
    </div>

    <div className="sorting-sim-footer">
      <span>A / ← Other choices</span><div><i style={{ width: `${progress}%` }} /></div><span>D / → My answer</span>
    </div>
    {dragging && <div className="sorting-cargo-ghost" style={{ left: pointer.x, top: pointer.y }}>{labels.object}</div>}
    {phase === "celebrate" && <div className="sorting-sim-celebration"><Gem /><h2>Shipment complete</h2><div>{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ "--sort-piece": index } as React.CSSProperties} />)}</div></div>}
  </div>;
}

function SortingDock({ group, label, description, icon, items, selected, active, onRoute }: {
  group: GroupKey; label: string; description: string; icon: React.ReactNode; items: SortOption[]; selected: string; active: boolean; onRoute: (key: string, group: GroupKey) => void;
}) {
  return <button type="button" data-sort-dock={group} onClick={() => selected && onRoute(selected, group)} className={`sorting-dock dock-${group.toLowerCase()} ${active ? "is-active" : ""}`}>
    <span className="sorting-dock-title">{icon}<span><small>{description}</small><b>{label}</b></span><em>{items.length}</em></span>
    <span className="sorting-dock-bay">
      {items.map((option, index) => (
        <i key={optionKey(option)} className="sorting-routed-option">
          <em>{option.optionKey || String.fromCharCode(65 + index)}</em>
          {option.imageUrl && <img src={option.imageUrl} alt="" />}
          <b>{option.optionText}</b>
        </i>
      ))}
      {!items.length && <strong>{group === "MISSION" ? "DROP YOUR ANSWER HERE" : "DROP OTHER OPTIONS HERE"}</strong>}
    </span>
  </button>;
}

function optionKey(option: SortOption) { return option.id || option.optionKey || option.optionText; }
function sortingMode(configuration: Record<string, unknown> | undefined, index: number): SortMode {
  const configured = String(configuration?.sortingType || configuration?.gameMode || "").toUpperCase();
  const modes: SortMode[] = ["RECYCLING", "WAREHOUSE", "TREASURE", "AIRPORT", "FARM", "SPACE", "POTION", "TOY"];
  return modes.find(mode => configured.includes(mode)) || modes[index % modes.length];
}
function modeLabels(mode: SortMode) {
  const labels: Record<SortMode, { name: string; mission: string; missionDock: string; storage: string; character: string; object: string }> = {
    RECYCLING:{name:"Recycling Factory",mission:"Material rescue shift",missionDock:"Priority recycler",storage:"Holding recycler",character:"🤖",object:"♻️"},
    WAREHOUSE:{name:"Warehouse Manager",mission:"Express dispatch",missionDock:"Dispatch shelf",storage:"Storage shelf",character:"🧑‍🔧",object:"📦"},
    TREASURE:{name:"Treasure Sorting",mission:"Captain's cargo",missionDock:"Captain chest",storage:"Cargo chest",character:"🏴‍☠️",object:"💎"},
    AIRPORT:{name:"Airport Baggage",mission:"Departure routing",missionDock:"Mission gate",storage:"Holding gate",character:"🧑‍✈️",object:"🧳"},
    FARM:{name:"Farm Harvest",mission:"Market delivery",missionDock:"Market basket",storage:"Barn basket",character:"🧑‍🌾",object:"🧺"},
    SPACE:{name:"Space Cargo Station",mission:"Orbital loading",missionDock:"Launch dock",storage:"Reserve dock",character:"🧑‍🚀",object:"🛰️"},
    POTION:{name:"Magic Potion Lab",mission:"Cauldron experiment",missionDock:"Active cauldron",storage:"Ingredient rack",character:"🧙",object:"🧪"},
    TOY:{name:"Toy Factory",mission:"Gift packing line",missionDock:"Gift box",storage:"Toy storage",character:"🧑‍🎄",object:"🧸"},
  };
  return labels[mode];
}
