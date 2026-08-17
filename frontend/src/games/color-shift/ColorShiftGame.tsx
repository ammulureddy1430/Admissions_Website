"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MoveHorizontal, Play, Target, Timer } from "lucide-react";
import { ColorShiftEngine } from "./ColorShiftEngine";
import type { ActiveRule, ColorShiftMetrics, Shape } from "./Types";
import "./ColorShiftGame.css";
import "./ColorShiftHud.css";

type Props = { disabled?: boolean; remainingSeconds?: number; practiceOnly?: boolean; onComplete: (metrics: ColorShiftMetrics) => void | Promise<void> };
const palette = { blue: "#2f80ed", red: "#f34f64", green: "#35c88a", yellow: "#f7c948" };
function shapePath(ctx: CanvasRenderingContext2D, shape: Shape, size: number) {
  ctx.beginPath();
  if (shape === "circle") ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  else if (shape === "square") ctx.roundRect(-size / 2, -size / 2, size, size, 9);
  else { const sides = shape === "triangle" ? 3 : 4, offset = shape === "triangle" ? -Math.PI / 2 : Math.PI / 4; for (let i = 0; i < sides; i++) { const a = offset + i * Math.PI * 2 / sides; const x = Math.cos(a) * size / 2, y = Math.sin(a) * size / 2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); }
}
function RuleOrb({ rule }: { rule: ActiveRule }) {
  if (rule.type === "color") return <div className="cs-rule-orb cs-color-rule" aria-hidden>{(["circle", "square", "triangle", "diamond"] as Shape[]).map(shape => <b key={shape} className={`cs-mini cs-${shape}`} style={{ background: palette[rule.targetColor!] }} />)}</div>;
  if (rule.type === "shape") return <div className="cs-rule-orb cs-shape-rule" aria-hidden>{Object.values(palette).map(color => <b key={color} className={`cs-mini cs-${rule.targetShape}`} style={{ background: color }} />)}</div>;
  return <div className="cs-rule-orb" aria-hidden><b className={`cs-mini cs-${rule.targetShape}`} style={{ background: palette[rule.targetColor!] }} /></div>;
}
export default function ColorShiftGame({ disabled = false, remainingSeconds, practiceOnly = false, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null), engineRef = useRef<ColorShiftEngine | null>(null), frameRef = useRef(0), finished = useRef(false), last = useRef(0), completeRef = useRef(onComplete);
  const [rule, setRule] = useState<ActiveRule>(() => ({ type: "color", targetColor: "blue", targetShape: "circle" }));
  const [shifting, setShifting] = useState(false);
  const [started, setStarted] = useState(false);
  const [previewSeconds, setPreviewSeconds] = useState(remainingSeconds ?? 120);
  const [collected, setCollected] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [missed, setMissed] = useState(0);
  const displayedSeconds = practiceOnly ? previewSeconds : (remainingSeconds ?? 0);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  const finish = useCallback((status = "COMPLETED") => { if (finished.current) return; finished.current = true; cancelAnimationFrame(frameRef.current); const engine = engineRef.current; if (engine) void completeRef.current(engine.finish(status)); }, []);
  useEffect(() => { if (started && !practiceOnly && remainingSeconds !== undefined && remainingSeconds <= 0) finish(); }, [finish, practiceOnly, remainingSeconds, started]);
  useEffect(() => {
    if (!started || !practiceOnly || disabled || finished.current) return;
    const timer = window.setInterval(() => setPreviewSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [disabled, practiceOnly, started]);
  useEffect(() => { if (started && practiceOnly && previewSeconds === 0) finish(); }, [finish, practiceOnly, previewSeconds, started]);
  useEffect(() => {
    if (!started || disabled || finished.current) return; const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const engine = new ColorShiftEngine(); engineRef.current = engine; last.current = performance.now(); setRule(engine.rule);
    const resize = () => { const rect = canvas.getBoundingClientRect(), scale = Math.min(devicePixelRatio || 1, 2); canvas.width = rect.width * scale; canvas.height = rect.height * scale; ctx.setTransform(scale, 0, 0, scale, 0, 0); engine.movePlayer(engine.playerX || rect.width / 2, rect.width); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const move = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); engine.movePlayer(event.clientX - rect.left, rect.width); };
    let activePointer: number | null = null;
    const beginDrag = (event: PointerEvent) => {
      event.preventDefault();
      activePointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      move(event);
    };
    const drag = (event: PointerEvent) => { if (activePointer === event.pointerId) move(event); };
    const endDrag = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      activePointer = null;
    };
    const keys = (event: KeyboardEvent) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); const rect = canvas.getBoundingClientRect(); engine.movePlayer(engine.playerX + (event.key === "ArrowLeft" ? -42 : 42), rect.width); };
    canvas.addEventListener("pointerdown", beginDrag); canvas.addEventListener("pointermove", drag); canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag); window.addEventListener("keydown", keys);
    let lastRule = engine.rule;
    let lastEventCount = 0;
    const draw = (now: number) => { const rect = canvas.getBoundingClientRect(), dt = Math.min(.032, (now - last.current) / 1000); last.current = now; engine.update(now, dt, rect.width, rect.height);
      if (engine.rule !== lastRule) { lastRule = engine.rule; setRule(engine.rule); setShifting(true); window.setTimeout(() => setShifting(false), 1200); }
      if (engine.events.length !== lastEventCount) { lastEventCount = engine.events.length; setCollected(engine.events.filter(event => event.kind === "target").length); setMistakes(engine.events.filter(event => event.kind === "distractor").length); setMissed(engine.events.filter(event => event.kind === "miss").length); }
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const o of engine.objects) { ctx.save(); ctx.translate(o.x, o.y); ctx.shadowColor = palette[o.color]; ctx.shadowBlur = 16; ctx.fillStyle = palette[o.color]; shapePath(ctx, o.shape, o.size); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.78)"; ctx.stroke(); ctx.restore(); }
      const x = engine.playerX, y = rect.height - 62; ctx.save(); ctx.translate(x, y); ctx.shadowColor = "#35ead1"; ctx.shadowBlur = 24; ctx.fillStyle = "#f8ffff"; ctx.beginPath(); ctx.roundRect(-35, -23, 70, 46, 22); ctx.fill(); ctx.strokeStyle = "#27cdb7"; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = "#16384a"; ctx.beginPath(); ctx.arc(-13, -2, 4, 0, 7); ctx.arc(13, -2, 4, 0, 7); ctx.fill(); ctx.restore();
      frameRef.current = requestAnimationFrame(draw); };
    frameRef.current = requestAnimationFrame(draw); return () => { observer.disconnect(); canvas.removeEventListener("pointerdown", beginDrag); canvas.removeEventListener("pointermove", drag); canvas.removeEventListener("pointerup", endDrag); canvas.removeEventListener("pointercancel", endDrag); window.removeEventListener("keydown", keys); cancelAnimationFrame(frameRef.current); };
  }, [disabled, started]);
  const targetText = rule.type === "color" ? `${rule.targetColor} objects` : rule.type === "shape" ? `${rule.targetShape}s` : `${rule.targetColor} ${rule.targetShape}s`;
  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  return <div className={`color-shift ${shifting ? "is-shifting" : ""}`}>
    <div className="cs-sky"><span/><span/><span/></div>
    <div className="cs-hud">
      <div><small>TARGET</small><strong><RuleOrb rule={rule}/><span>Catch {targetText}</span></strong></div>
      <div><small>CAUGHT</small><b>{collected}</b></div>
      <div><small>WRONG CAUGHT</small><b>{mistakes}</b></div>
      <div><small>TARGETS MISSED</small><b>{missed}</b></div>
      <div className={displayedSeconds <= 10 ? "cs-time warning" : "cs-time"}><Timer/><span><small>TIME LEFT</small><b>{formatTime(displayedSeconds)}</b></span></div>
    </div>
    <canvas ref={canvasRef} aria-label="Color Shift play arena: drag the robot to catch matching objects"/>
    <div className="cs-floor"/>
    {started && <div className="cs-tip" aria-live="polite">Drag the robot under matching {targetText}. Avoid the others!</div>}
    {!started && <div className="cs-intro"><div className="cs-intro-card">
      <div className="cs-intro-icon">🤖</div><p>HOW TO PLAY</p><h2>Color Shift</h2>
      <div className="cs-steps"><div><Target/><span><b>1. Check the target</b><small>The top card shows the color or shape to catch.</small></span></div><div><MoveHorizontal/><span><b>2. Move the robot</b><small>Drag left and right, or use the arrow keys.</small></span></div><div><Timer/><span><b>3. Catch and adapt</b><small>Catch only matching objects before time runs out. The target will change!</small></span></div></div>
      <button type="button" onClick={() => setStarted(true)}><Play/> Start Game</button>
    </div></div>}
  </div>;
}
