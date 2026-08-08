"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyticsService } from "./AnalyticsService";
import { DifficultyManager } from "./DifficultyManager";
import { GameEngine } from "./GameEngine";
import { RuleChangeManager } from "./RuleChangeManager";
import { RuleManager } from "./RuleManager";
import { SoundManager } from "./SoundManager";
import { TrafficSignalManager } from "./TrafficSignalManager";
import { VehicleController } from "./VehicleController";
import type { RawTrafficMetrics, RuleSet, SignalColor, TrafficMetrics, VehicleAction } from "./Types";
import "./TrafficLightChallengeGame.css";

const DURATION = 120;
const icon = { green: "➜", yellow: "≈", red: "✋" } as const;
const emptyMetrics = (duration: number): RawTrafficMetrics => ({ age_group: "4–5 Years", duration_seconds: duration, signals_presented: 0, signals_responded_to: 0, missed_signals: 0, unnecessary_actions: 0, rule_changes: 0, rule_change_responses: 0, successful_adaptations: 0, response_times: [], correct_responses: 0, highest_difficulty: 1, started_at: new Date().toISOString() });

export default function TrafficLightChallengeGame({ disabled = false, sound = true, durationSeconds = DURATION, onComplete }: { disabled?: boolean; sound?: boolean; durationSeconds?: number; onComplete: (metrics: TrafficMetrics) => void | Promise<void> }) {
  const [phase, setPhase] = useState<"intro"|"playing"|"demo"|"complete">("intro");
  const [seconds, setSeconds] = useState(durationSeconds);
  const [signal, setSignal] = useState<SignalColor>("green");
  const [rules, setRules] = useState<RuleSet>("normal");
  const [level, setLevel] = useState(1);
  const [pressed, setPressed] = useState(false);
  const [action, setAction] = useState<VehicleAction>("stop");
  const startedAt = useRef(0); const signalAt = useRef(0); const finished = useRef(false); const held = useRef(false);
  const metrics = useRef(emptyMetrics(durationSeconds)); const analytics = useRef(new AnalyticsService(onComplete)); const sounds = useRef<SoundManager | null>(null);
  const difficulty = useRef(new DifficultyManager()); const signals = useRef(new TrafficSignalManager()); const ruleManager = useRef(new RuleManager()); const ruleChanges = useRef(new RuleChangeManager()); const vehicle = useRef(new VehicleController());
  useEffect(() => { analytics.current = new AnalyticsService(onComplete); }, [onComplete]);
  useEffect(() => { sounds.current ??= new SoundManager(sound); sounds.current.setEnabled(sound); }, [sound]);

  const finish = useCallback(async () => {
    if (finished.current) return; finished.current = true; setPhase("complete"); setPressed(false); setAction("stop");
    const elapsed = startedAt.current ? Math.min(durationSeconds, (performance.now() - startedAt.current) / 1000) : 0;
    await analytics.current.save(new GameEngine().finish(metrics.current, elapsed, durationSeconds));
  }, [durationSeconds]);

  const assessPrevious = useCallback(() => {
    const expected = ruleManager.current.expected(signal, rules); const actual = vehicle.current.action(held.current, signal); const correct = actual === expected;
    metrics.current.signals_presented += 1; metrics.current.signals_responded_to += held.current ? 1 : 0; metrics.current.correct_responses += correct ? 1 : 0;
    if (!correct && held.current) metrics.current.unnecessary_actions += 1; if (!correct && !held.current) metrics.current.missed_signals += 1;
    if (rules !== "normal") { metrics.current.rule_change_responses += 1; metrics.current.successful_adaptations += correct ? 1 : 0; }
    if (held.current) metrics.current.response_times.push(Math.round(performance.now() - signalAt.current));
  }, [rules, signal]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = window.setInterval(() => { const elapsed = Math.floor((performance.now() - startedAt.current) / 1000); setSeconds(Math.max(0, durationSeconds - elapsed)); if (elapsed >= durationSeconds) void finish(); }, 250);
    return () => clearInterval(tick);
  }, [durationSeconds, finish, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setTimeout(() => {
      assessPrevious(); const elapsed = (performance.now() - startedAt.current) / 1000; const nextLevel = difficulty.current.level(elapsed);
      if (nextLevel !== level) { setLevel(nextLevel); metrics.current.highest_difficulty = nextLevel; const nextRules = ruleChanges.current.forLevel(nextLevel); if (nextRules !== rules) { metrics.current.rule_changes += 1; setRules(nextRules); setPhase("demo"); sounds.current?.tone(440, .16); return; } }
      setSignal(value => signals.current.next(value, nextLevel)); signalAt.current = performance.now(); sounds.current?.tone(360);
    }, difficulty.current.interval(level));
    return () => clearTimeout(timer);
  }, [assessPrevious, level, phase, rules]);

  useEffect(() => {
    if (phase !== "demo") return; const timer = window.setTimeout(() => { signalAt.current = performance.now(); setPhase("playing"); }, 3200); return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    setAction(held.current ? (signal === "yellow" ? "slow" : "move") : "stop");
  }, [signal]);

  const start = () => { if (disabled) return; metrics.current = emptyMetrics(durationSeconds); startedAt.current = performance.now(); signalAt.current = performance.now(); finished.current = false; setSeconds(durationSeconds); setSignal("green"); setRules("normal"); setLevel(1); setPhase("playing"); sounds.current?.tone(520, .12); };
  const setPedal = (down: boolean) => { if (disabled || phase !== "playing") return; held.current = down; setPressed(down); setAction(vehicle.current.action(down, signal)); if (down) sounds.current?.tone(190, .05); };
  const speed = action === "move" ? 1 : action === "slow" ? .45 : 0;
  const roadDuration = speed ? `${1.1 / speed}s` : "0s";

  return <main className="tlc" style={{ "--road-speed": roadDuration } as React.CSSProperties}>
    <div className="tlc-sky"><i className="tlc-cloud c1"/><i className="tlc-cloud c2"/><span className="tlc-sun">☀</span></div>
    <div className="tlc-hud"><div className="tlc-level">{Array.from({length:6},(_,i)=><i key={i} className={i < level ? "on" : ""}/>)}</div><div className="tlc-time">◷ <b>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</b></div></div>
    <section className={`tlc-world ${speed ? "moving" : ""}`}>
      <div className="tlc-city"><i/><i/><i/><i/><i/></div><div className="tlc-trees">🌳　🌲　🌳　🌲　🌳</div>
      <div className="tlc-road"><div className="tlc-lines"/></div>
      <div className={`tlc-car ${speed ? "drive" : ""}`}><span>🧒</span><div className="tlc-carbody">★</div><i/><i/></div>
      <div className="tlc-light" aria-label={`${signal} signal`}>
        {(["red","yellow","green"] as SignalColor[]).map(color=><div key={color} className={`${color} ${signal===color?"active":""}`}><span>{icon[color]}</span></div>)}
      </div>
    </section>
    <button className={`tlc-pedal ${pressed ? "pressed" : ""}`} aria-label="Vehicle pedal" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setPedal(true)}} onPointerUp={()=>setPedal(false)} onPointerCancel={()=>setPedal(false)} disabled={disabled || phase!=="playing"}><span>👟</span><i/></button>
    {phase === "intro" && <div className="tlc-overlay"><div className="tlc-demo normal"><div className="mini-light green">➜</div><div className="mini-car go">🚙</div><div className="mini-light red">✋</div><div className="mini-car">🚙</div></div><button onClick={start} className="tlc-start" aria-label="Start">▶</button></div>}
    {phase === "demo" && <div className="tlc-overlay rule-demo"><div className="tlc-swap">↻</div><div className="tlc-demo"><div className="mini-light green">➜</div><div className={`mini-car ${rules==="normal"?"go":""}`}>🚙</div><div className="mini-light red">✋</div><div className={`mini-car ${rules==="reversed"?"go":""}`}>🚙</div>{rules==="yellow-stop"&&<><div className="mini-light yellow">≈</div><div className="mini-car">🚙</div></>}</div></div>}
    {phase === "complete" && <div className="tlc-overlay"><div className="tlc-finish">🏁</div></div>}
  </main>;
}
