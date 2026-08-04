"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Contrast,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Maximize2,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Target,
  Timer,
  Trophy,
  Type,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tutorial = {
  icon?: string;
  category?: string;
  tutorialTitle?: string;
  tutorialDescription?: string;
  tutorialVideoUrl?: string | null;
  steps?: string[];
  skills?: string[];
  avoid?: string[];
  strategy?: string;
  controls?: { desktop?: string[]; touch?: string[] };
  timer?: { minutes?: number | null; pauses?: boolean; expiry?: string };
  scoring?: Record<string, number>;
  game?: { name?: string; engineKey?: string };
  assessment?: { difficulty?: string; grade?: string; allowRestart?: boolean };
};


export function GameTutorialScreen({ tutorial, busy, practiceReady, onClose, onPractice, onStart }: {
  tutorial: Tutorial;
  busy: boolean;
  practiceReady: boolean;
  onClose: () => void;
  onPractice: () => void;
  onStart: () => void;
}) {
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const steps: string[] = tutorial.steps || [];
  const assessment = tutorial.assessment || {};
  const scoring = tutorial.scoring || {};
  const controls = tutorial.controls || { desktop: [], touch: [] };

  const startAssessmentFullscreen = async () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    if (!document.fullscreenElement) {
      const request = root.requestFullscreen?.bind(root) || root.webkitRequestFullscreen?.bind(root);
      if (request) {
        try {
          // Wait for the browser to finish entering fullscreen before React removes
          // the tutorial overlay and mounts the assessment player.
          await Promise.resolve(request());
        } catch {
          // The runtime also exposes a fullscreen button if the browser blocks this request.
        }
      }
    }

    await Promise.resolve(onStart());
  };

  if (typeof document === "undefined") return null;

  return createPortal((
    <div className={`${highContrast ? "bg-black text-white" : "bg-[#f3f7f6] text-[#071633]"} fixed inset-0 z-[9998] overflow-y-auto ${largeText ? "text-[115%]" : ""}`}>
      <header className={`${highContrast ? "border-white/30 bg-black" : "border-[#d9e8e4] bg-white/95"} sticky top-0 z-20 border-b backdrop-blur-xl`}>
        <div className="flex min-h-[88px] w-full items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid h-[62px] w-[62px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#e3f6f1] text-[#008f80]">
              {tutorial.game?.engineKey === "BALLOON_POP" ? (
                <Image src="/game-assets/balloon-popper-tutorial.png" alt="" fill sizes="62px" className="object-cover object-[32%_70%]" />
              ) : (
                <Gamepad2 className="h-7 w-7" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#008f80]">Game tutorial</p><h1 className="truncate text-lg font-black sm:text-[24px]">{tutorial.game?.name}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLargeText(v => !v)} aria-pressed={largeText} aria-label="Toggle large text" className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#173349]"><Type className="h-5 w-5" /></button>
            <button onClick={() => setHighContrast(v => !v)} aria-pressed={highContrast} aria-label="Toggle high contrast" className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#173349]"><Contrast className="h-5 w-5" /></button>
            <button onClick={onClose} aria-label="Close tutorial" className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#173349]"><X className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <main className="w-full space-y-7 p-4 pb-8 sm:p-8 sm:pb-10">
        {practiceReady && <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900"><CheckCircle2 className="h-6 w-6" /><div><b>Great! You are ready.</b><p className="text-xs">Replay practice or begin the scored assessment.</p></div></div>}

        <section className="grid min-h-[490px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#08213d] via-[#075c63] to-[#008f80] !text-white shadow-[0_18px_38px_rgba(7,54,63,.16)] lg:grid-cols-[1.3fr_.7fr]" style={{ color: "#ffffff" }}>
          <div className="flex flex-col justify-start p-7 sm:p-11 lg:p-12">
            <div className="flex flex-wrap gap-2"><Tag>{tutorial.category}</Tag><Tag>{assessment.difficulty}</Tag><Tag>{assessment.grade}</Tag></div>
            <h2 className="mt-8 max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.035em] !text-white sm:text-5xl" style={{ color: "#ffffff" }}>{tutorial.tutorialTitle}</h2>
            <p className="mt-5 max-w-3xl text-base leading-7 !text-white/75 sm:text-lg" style={{ color: "rgba(255,255,255,.78)" }}>{tutorial.tutorialDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">{(tutorial.skills || []).map((skill: string) => <span key={skill} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">{skill}</span>)}</div>
          </div>
          <div className="grid min-h-80 place-items-center border-t border-white/10 bg-[#2b8c91]/35 p-5 lg:border-l lg:border-t-0 lg:p-6">
            <BuiltInVideoTutorial icon={tutorial.icon} steps={steps} engineKey={tutorial.game?.engineKey} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <InfoCard icon={Target} title="Game objective"><p>{tutorial.tutorialDescription}</p><p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Strategy: {tutorial.strategy}</p></InfoCard>
          <InfoCard icon={Gamepad2} title="Controls"><ControlGroup title="Desktop" values={controls.desktop || []} icon={MousePointer2} /><ControlGroup title="Touch device" values={controls.touch || []} icon={Maximize2} /></InfoCard>
          <InfoCard icon={Timer} title="Timer"><dl className="space-y-2 text-sm"><Line label="Time limit" value={tutorial.timer?.minutes ? `${tutorial.timer.minutes} minutes` : "Configured per game"} /><Line label="Can pause" value={tutorial.timer?.pauses ? "Yes" : "No"} /><Line label="At zero" value={tutorial.timer?.expiry} /></dl></InfoCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <InfoCard icon={GraduationCap} title="Step-by-step guide"><ol className="grid gap-3 sm:grid-cols-2">{steps.map((step: string, index: number) => <li key={step} className="flex gap-3 rounded-xl border border-[#dce8e5] bg-[#f8fbfa] p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#008f80] text-xs font-black text-white">{index + 1}</span><span className="text-sm leading-5">{step}</span></li>)}</ol></InfoCard>
          <InfoCard icon={AlertTriangle} title="Things to avoid"><ul className="space-y-2">{(tutorial.avoid || []).map((item: string) => <li key={item} className="flex gap-2 text-sm"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />{item}</li>)}</ul></InfoCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <InfoCard icon={Trophy} title="Scoring rules"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Correct action" value={`+${scoring.correctAction || 0}`} /><Metric label="Wrong action" value={`${scoring.wrongAction || 0}`} /><Metric label="Hint penalty" value={`-${scoring.hintPenalty || 0}`} /><Metric label="Time bonus" value={scoring.timeBonus || 0} /><Metric label="Maximum score" value={scoring.maximumScore || 0} /><Metric label="Passing score" value={`${scoring.passingScore || 0}%`} /></div></InfoCard>
          <InfoCard icon={HelpCircle} title="Quick help"><div className="space-y-3 text-sm"><Faq q="Can I replay the tutorial?" a="Yes. You may return to this tutorial before starting." /><Faq q="Does practice affect my score?" a="No. Practice is isolated and never appears in assessment reports." /><Faq q="Can I retry the assessment?" a={assessment.allowRestart ? "Yes, within the configured attempt limit." : "No. Restart is disabled for this assignment."} /><Faq q="How is my score calculated?" a="Only the scored assessment uses the rules shown on this page." /></div></InfoCard>
        </section>
      </main>

      <footer className={`${highContrast ? "border-white/30 bg-black" : "border-[#d9e8e4] bg-white"} sticky bottom-0 border-t p-3 shadow-[0_-10px_30px_rgba(7,22,51,.08)]`}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <button disabled={busy} onClick={onPractice} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a9d6cd] px-5 py-3 text-xs font-black text-[#087466] disabled:opacity-50"><RotateCcw className="h-4 w-4" />{practiceReady ? "Replay Practice" : "Practice Game"}</button>
          <button disabled={busy} onClick={startAssessmentFullscreen} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#008f80] px-6 py-3 text-xs font-black !text-white shadow-lg disabled:opacity-50" style={{ color: "#ffffff" }}>Start Assessment <ArrowRight className="h-4 w-4" /></button>
        </div>
      </footer>
    </div>
  ), document.body);
}

function AdventureTutorialScene({ scene, sceneCount, playing }: { scene: number; sceneCount: number; playing: boolean }) {
  const progress = scene / Math.max(sceneCount - 1, 1);
  return <div className="absolute inset-x-0 bottom-0 h-[68%] overflow-hidden">
    <div className="absolute bottom-0 left-0 h-[62%] w-full bg-emerald-700 [clip-path:polygon(0_45%,18%_20%,34%_48%,51%_8%,70%_42%,86%_18%,100%_44%,100%_100%,0_100%)]" />
    <div className="absolute bottom-[17%] left-[8%] right-[8%] h-2 -rotate-2 rounded-full bg-amber-200 shadow-[0_0_0_3px_rgba(120,70,30,.35)]" />
    {[12, 38, 64, 88].map((left, index) => <div key={left} className={`absolute bottom-[12%] grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border-4 text-lg shadow-lg ${index <= scene ? "border-cyan-200 bg-[#008f80]" : "border-white bg-[#173349]"}`} style={{ left: `${left}%` }}>{index === 3 ? "🏁" : index + 1}</div>)}
    <div className="absolute bottom-[22%] text-5xl drop-shadow-xl transition-[left,transform] duration-700" style={{ left: `${12 + progress * 76}%`, transform: `translateX(-50%) ${playing ? "translateY(-4px)" : ""}` }}>🧭</div>
    <div className="absolute bottom-[43%] left-[6%] text-4xl">🌴</div><div className="absolute bottom-[49%] right-[9%] text-4xl">⛰️</div>
  </div>;
}

function RacingTutorialScene({ icon, scene, sceneCount, playing, engineKey }: { icon?: string; scene: number; sceneCount: number; playing: boolean; engineKey?: string }) {
  if (engineKey === "BALLOON_POP") {
    return <Image src="/game-assets/balloon-popper-tutorial.png" alt="Red balloon moving toward a finish flag" fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover" priority />;
  }
  return <>
    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-slate-700 [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]"><div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,#fff_0_12px,transparent_12px_25px)] opacity-80" /></div>
    <div className="absolute bottom-[12%] text-5xl drop-shadow-xl transition-[left,transform] duration-700 sm:text-6xl" style={{ left: `${18 + (scene / Math.max(sceneCount - 1, 1)) * 58}%`, transform: `translateX(-50%) ${playing ? "scale(1.08)" : "scale(1)"}` }}>{icon || "🏎️"}</div>
    <div className="absolute bottom-[9%] right-[7%] text-4xl">🏁</div>
  </>;
}

export function BuiltInVideoTutorial({ icon, steps, engineKey }: { icon?: string; steps: string[]; engineKey?: string }) {
  const sceneLength = 5;
  const duration = Math.max(steps.length, 1) * sceneLength;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scene = Math.min(Math.floor(time / sceneLength), Math.max(steps.length - 1, 0));

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTime(current => {
        if (current + 0.1 >= duration) {
          setPlaying(false);
          return duration;
        }
        return current + 0.1;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, duration]);

  const seek = (value: number) => {
    setTime(Math.min(Math.max(value, 0), duration));
    if (value < duration) setPlaying(true);
  };

  return (
    <div className="w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#041728] shadow-2xl" aria-label="Game video tutorial">
      <div className={`relative aspect-video overflow-hidden ${engineKey === "ADVENTURE_GAME" ? "bg-emerald-600" : "bg-sky-200"}`}>
        {engineKey === "ADVENTURE_GAME" ? <AdventureTutorialScene scene={scene} sceneCount={steps.length} playing={playing} /> : <RacingTutorialScene icon={icon} scene={scene} sceneCount={steps.length} playing={playing} engineKey={engineKey} />}
        <div className="absolute left-[6%] right-[6%] top-[7%] rounded-2xl border border-white/20 bg-[#071633] px-5 py-4 text-left shadow-xl">
          <p className="text-[10px] font-black uppercase tracking-[.18em] !text-cyan-200" style={{ color: "#a5f3fc" }}>Video tutorial · Step {scene + 1}</p>
          <p className="mt-2 text-sm font-black leading-5 !text-white sm:text-base lg:text-lg" style={{ color: "#ffffff" }}>{steps[scene] || "Learn how to play the game."}</p>
        </div>
        {!playing && time >= duration && <button onClick={() => seek(0)} className="absolute inset-0 grid place-items-center bg-[#041728]/45" aria-label="Replay tutorial"><span className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#008f80] shadow-xl"><RotateCcw className="h-7 w-7" /></span></button>}
      </div>
      <div className="flex items-center gap-4 px-5 py-4">
        <button onClick={() => time >= duration ? seek(0) : setPlaying(value => !value)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#00b7a4] text-white" aria-label={playing ? "Pause tutorial" : "Play tutorial"}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
        <input aria-label="Tutorial progress" type="range" min={0} max={duration} step={0.1} value={time} onChange={event => seek(Number(event.target.value))} className="h-1.5 w-full accent-[#30d5c8]" />
        <span className="w-20 text-right text-xs font-bold tabular-nums !text-white" style={{ color: "#ffffff" }}>{Math.floor(time)}s / {duration}s</span>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] !text-white" style={{ color: "#ffffff" }}>{children || "—"}</span>; }
function InfoCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) { return <article className="rounded-[24px] border border-[#dce8e5] bg-white p-7 text-base leading-7 text-[#173349] shadow-[0_8px_22px_rgba(7,54,63,.06)]"><h3 className="mb-5 flex items-center gap-3 text-lg font-black"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#e5f6f2] text-[#008f80]"><Icon className="h-5 w-5" /></span>{title}</h3>{children}</article>; }
function ControlGroup({ title, values, icon: Icon }: { title: string; values: string[]; icon: LucideIcon }) { return <div className="mb-3"><p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Icon className="h-3.5 w-3.5" />{title}</p><div className="flex flex-wrap gap-2">{values.map(value => <span key={value} className="rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs font-bold">{value}</span>)}</div></div>; }
function Line({ label, value }: { label: string; value?: string | number | null }) { return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold">{value || "—"}</dd></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-[#f3f8f7] p-3"><p className="text-[9px] font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-[#087466]">{value}</p></div>; }
function Faq({ q, a }: { q: string; a: string }) { return <details className="rounded-xl border p-3"><summary className="cursor-pointer font-bold">{q}</summary><p className="mt-2 text-xs leading-5 text-slate-600">{a}</p></details>; }
