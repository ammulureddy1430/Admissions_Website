"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  Coins,
  Flag,
  Gamepad2,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { GameRuntimePlayer } from "@/components/game-runtime-player";
import { GameTutorialScreen } from "@/components/game-tutorial-screen";

type Row = Record<string, any>;
export default function StudentGames() {
  const [games, setGames] = useState<Row[]>([]),
    [profile, setProfile] = useState<Row>({}),
    [leaderboard, setLeaderboard] = useState<Row[]>([]),
    [runtime, setRuntime] = useState<Row | null>(null),
    [activeAssignment, setActiveAssignment] = useState(""),
    [busy, setBusy] = useState(""),
    [raceResult, setRaceResult] = useState<Row | null>(null),
    [tutorial, setTutorial] = useState<Row | null>(null),
    [tutorialAssignment, setTutorialAssignment] = useState<Row | null>(null),
    [practiceMode, setPracticeMode] = useState(false),
    [practiceReady, setPracticeReady] = useState(false);
  const request = async (path: string, init?: RequestInit) => {
    const r = await fetch(`http://localhost:5001/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("studentToken") || localStorage.getItem("token") || ""}`,
        "x-tenant-id": localStorage.getItem("studentSchoolId") || localStorage.getItem("schoolId") || "",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const p = await r.json().catch(() => null);
    if (!r.ok)
      throw new Error(
        Array.isArray(p?.message)
          ? p.message.join(", ")
          : p?.message || "Request failed.",
      );
    return p;
  };
  const load = async () => {
    const [g, p, l] = await Promise.all([
      request("game-assessments/student/games"),
      request("game-assessments/gamification/profile"),
      request("game-assessments/gamification/leaderboard"),
    ]);
    setGames(g);
    setProfile(p);
    setLeaderboard(l);
  };
  useEffect(() => {
    void load();
  }, []);
  const start = async (a: Row, restart = false) => {
    setBusy(a.id);
    try {
      const s = await request(
        `game-assessments/student/games/${a.id}/${restart ? "restart" : "start"}`,
        { method: "POST", body: "{}" },
      );
      setActiveAssignment(a.id);
      setRuntime(s);
    } finally {
      setBusy("");
    }
  };
  const openTutorial = async (assignment: Row) => {
    setBusy(assignment.id);
    try {
      const data = await request(`game-assessments/student/games/${assignment.id}/tutorial`);
      setTutorialAssignment(assignment);
      setTutorial(data);
      setPracticeReady(Boolean(data.progress?.practiceCompleted));
    } finally {
      setBusy("");
    }
  };
  const startFromTutorial = async () => {
    if (!tutorialAssignment) return;
    setBusy(tutorialAssignment.id);
    try {
      await request(`game-assessments/student/games/${tutorialAssignment.id}/tutorial/progress`, {
        method: "POST",
        body: JSON.stringify({ tutorialViewed: true }),
      });
      const assignment = tutorialAssignment;
      setTutorial(null);
      await start(assignment);
    } finally {
      setBusy("");
    }
  };
  const startPractice = async () => {
    if (!tutorialAssignment) return;
    setBusy(tutorialAssignment.id);
    try {
      await request(`game-assessments/student/games/${tutorialAssignment.id}/tutorial/progress`, {
        method: "POST",
        body: JSON.stringify({ tutorialViewed: true }),
      });
      const session = await request(`game-assessments/student/games/${tutorialAssignment.id}/practice/start`, {
        method: "POST",
        body: "{}",
      });
      setPracticeMode(true);
      setRuntime(session);
    } finally {
      setBusy("");
    }
  };
  const complete = async (session: Row) => {
    if (practiceMode) {
      setRuntime(null);
      setPracticeMode(false);
      setPracticeReady(true);
      if (tutorialAssignment) {
        await request(`game-assessments/student/games/${tutorialAssignment.id}/practice/finish`, {
          method: "POST",
          body: JSON.stringify({ sessionId: session.id }),
        });
      }
      return;
    }
    const result = await request(
      `game-assessments/student/games/${activeAssignment}/submit`,
      { method: "POST", body: JSON.stringify({ sessionId: session.id }) },
    );
    setRuntime(null);
    if (
      ["ADVENTURE_GAME", "BOARD_GAME", "DRAG_DROP", "LOGIC_GAME", "MAZE", "RACING_GAME", "SORTING_GAME", "TREASURE_HUNT"].includes(
        session.engine?.engineKey,
      )
    )
      setRaceResult({ ...result, engineKey: session.engine?.engineKey });
    else
      alert(
        `Game complete! Score ${result.score} · ${result.rewards?.xpEarned || 0} XP earned`,
      );
    await load();
  };
  return (
    <div className="min-h-screen bg-[#f4f8f7] p-4 text-[#071633] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#073f3b] via-[#087466] to-[#008f80] p-6 shadow-[0_18px_45px_rgba(7,63,59,0.16)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-12 h-44 w-44 rounded-full bg-white/5" />
          <Link
            href="/student-assessment/dashboard"
            className="relative inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold !text-white transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="relative mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] !text-white">
                Student game zone
              </span>
              <h1 className="mt-3 text-3xl font-black !text-white sm:text-4xl">
                Learn. Play. Level up.
              </h1>
              <p className="mt-2 text-xs !text-[#c9e7e2]">
                Your assigned educational games and rewards.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [Sparkles, profile.xp || 0, "XP"],
                [Coins, profile.coins || 0, "Coins"],
                [Trophy, profile.level || 1, "Level"],
              ].map(([I, v, l]: any) => (
                <div key={l} className="min-w-[70px] rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                  <I className="mx-auto h-4 w-4 !text-[#8ce0d2]" />
                  <p className="mt-1 font-black !text-white">{v}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wider !text-[#b7dcd6]">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games.map((a) => (
            <article
              key={a.id}
              className={`group overflow-hidden rounded-3xl border border-[#d8e6e3] bg-white shadow-[0_10px_30px_rgba(25,69,61,0.07)] transition hover:-translate-y-0.5 hover:border-[#9bcfc6] hover:shadow-[0_16px_38px_rgba(25,69,61,0.11)] ${games.length === 1 ? "md:col-span-2 xl:col-span-2" : ""}`}
            >
              <div className="h-1.5 bg-[#008f80]" />
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#effaf7] text-[#087466] ring-1 ring-[#b9e8dc]">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-[9px] font-black tracking-wider ${a.availability.available ? "border-[#b9e8dc] bg-[#effaf7] text-[#087466]" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                  >
                    {a.availability.available ? "AVAILABLE" : "LOCKED"}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-black text-[#0b1f33] group-hover:text-[#008f80]">{a.generatedGame?.title}</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {a.generatedGame?.engineKey?.replaceAll("_", " ")} ·{" "}
                  {a.maxAttempts} attempts
                </p>
                {a.result && (
                  <div className="mt-5 rounded-2xl border border-[#e5edeb] bg-[#f8fbfa] p-4 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#657985]">Progress</span>
                      <b className="rounded-md bg-white px-2 py-1 text-[10px] text-[#173349] shadow-sm">{(a.result.status === "NOT_STARTED" ? "IN_PROGRESS" : a.result.status).replaceAll("_", " ")}</b>
                    </div>
                    {a.result.status === "COMPLETED" && (
                      <p className="mt-1 text-emerald-700">
                        {Math.round(a.result.percentage)}%
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={!a.availability.available || !!busy}
                    onClick={() => openTutorial(a)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#008f80] py-3 text-xs font-black !text-white shadow-[0_10px_22px_rgba(0,143,128,0.18)] transition hover:bg-[#007d70] disabled:opacity-40"
                  >
                    {busy === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {a.result?.status === "IN_PROGRESS" ? "Resume" : "View Tutorial"}
                  </button>
                  {a.allowRestart && a.result && (
                    <button
                      onClick={() => start(a, true)}
                      className="rounded-xl border border-[#c9dcd7] bg-white p-3 text-[#506877] transition hover:border-[#80c9be] hover:text-[#008f80]"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#d8e6e3] bg-white p-5 shadow-[0_8px_24px_rgba(25,69,61,0.05)] sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trophy className="h-4 w-4" /></div><h2 className="text-sm font-black">Badges & achievements</h2></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.badges?.map((b: Row) => (
                <span
                  key={b.id}
                  className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                >
                  🏅 {b.badge.name}
                </span>
              ))}
              {!profile.badges?.length && (
                <p className="text-xs text-slate-400">
                  Complete a game to earn your first badge.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-3xl border border-[#d8e6e3] bg-white p-5 shadow-[0_8px_24px_rgba(25,69,61,0.05)] sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#effaf7] text-[#087466]"><Flag className="h-4 w-4" /></div><h2 className="text-sm font-black">Leaderboard</h2></div>
            {leaderboard.slice(0, 5).map((p, i) => (
              <div
                key={p.studentId}
                className="mt-3 flex justify-between rounded-xl border border-[#e5edeb] bg-[#f8fbfa] p-3 text-xs"
              >
                <span>
                  #{i + 1} · Player {p.studentId.slice(0, 6)}
                </span>
                <b>{p.xp} XP</b>
              </div>
            ))}
          </section>
        </div>
      </div>
      {runtime && (
        <GameRuntimePlayer
          initial={runtime}
          request={request}
          onClose={() => { setRuntime(null); setPracticeMode(false); }}
          onComplete={complete}
          secureMode={!practiceMode}
        />
      )}
      {tutorial && (
        <GameTutorialScreen
          tutorial={tutorial}
          busy={!!busy}
          practiceReady={practiceReady}
          onClose={() => { setTutorial(null); setTutorialAssignment(null); }}
          onPractice={startPractice}
          onStart={startFromTutorial}
        />
      )}
      {raceResult && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-[#051426]/85 p-4 backdrop-blur-xl">
          <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-[#102d4c] to-[#087568] p-6 text-white shadow-2xl sm:p-8">
            <button
              onClick={() => setRaceResult(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2"
              aria-label="Close result"
            >
              <X className="h-4 w-4" />
            </button>
            <Flag className="h-12 w-12 text-amber-300" />
            <h2 className="mt-4 text-3xl font-black">
              {raceResult.engineKey === "SORTING_GAME"
                ? "Sorting complete"
                : raceResult.engineKey === "DRAG_DROP"
                  ? "Workshop mission complete"
                : raceResult.engineKey === "BOARD_GAME"
                  ? "Board journey complete"
                : raceResult.engineKey === "LOGIC_GAME"
                  ? "Logic mission complete"
                : raceResult.engineKey === "MAZE"
                  ? "Maze expedition complete"
                : raceResult.engineKey === "ADVENTURE_GAME"
                  ? "Adventure complete"
                : raceResult.engineKey === "TREASURE_HUNT"
                  ? "Treasure hunt complete"
                  : "Race complete"}
            </h2>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Total Questions", raceResult.total],
                ["Attempted", raceResult.answered],
                ["Score", raceResult.score],
                ["Percentage", `${Math.round(raceResult.percentage || 0)}%`],
                ["Time Taken", formatRaceTime(raceResult.timeTaken)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md"
                >
                  <span className="text-[8px] font-black uppercase tracking-wider text-white/60">
                    {label}
                  </span>
                  <b className="mt-2 block text-lg">{value}</b>
                </div>
              ))}
            </div>
            <button
              onClick={() => setRaceResult(null)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-black text-[#087568]"
            >
              <Clock3 className="h-4 w-4" />
              Return to game zone
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function formatRaceTime(value: unknown) {
  const total = Math.max(0, Number(value) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
