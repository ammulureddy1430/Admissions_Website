"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  Gamepad2,
  Loader2,
  MapPin,
  RefreshCcw,
  Send,
  Sparkles,
  Trophy,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { GameRuntimePlayer } from "@/components/game-runtime-player";

type Row = Record<string, any>;
const emptySchoolVenue = () => ({
  assessmentDate: "",
  campus: "",
  building: "",
  floor: "",
  roomNumber: "",
  venue: "",
  slotId: "",
  slotName: "",
  startTime: "",
  endTime: "",
  sourceAssessment: "",
});
const toTimeInput = (value: string) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};
const matchesAgeGroup = (dateOfBirth: string, ageGroup: string) => {
  const bounds = ageGroup.match(/\d+/g)?.map(Number);
  if (!dateOfBirth || !bounds) return false;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= bounds[0] && age < bounds[1];
};

export default function TeacherGameStudio() {
  const [tab, setTab] = useState<"games" | "assign" | "analytics">("games"),
    [games, setGames] = useState<Row[]>([]),
    [mapping, setMapping] = useState<Row>({ mappings: [] }),
    [assessments, setAssessments] = useState<Row[]>([]),
    [analytics, setAnalytics] = useState<Row>({ summary: {}, byGame: [] }),
    [leaderboard, setLeaderboard] = useState<Row[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [runtime, setRuntime] = useState<Row | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
      title: "",
      templateId: "",
      engineKey: "QUIZ_CHALLENGE",
    }),
    [assignment, setAssignment] = useState({
      generatedGameId: "",
      gameAssessmentId: "",
      targetIds: "",
      targetType: "STUDENT",
      maxAttempts: 2,
      timeLimitMinutes: 20,
      passingScore: 60,
      allowRestart: true,
      deliveryMode: "HOME",
    });
  const [students, setStudents] = useState<Row[]>([]);
  const [schoolVenue, setSchoolVenue] = useState<Row | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [showAssignmentSettings, setShowAssignmentSettings] = useState(false);
  const request = async (path: string, init?: RequestInit) => {
    const token = localStorage.getItem("token") || "",
      schoolId = localStorage.getItem("schoolId") || "";
    if (!token || !schoolId)
      throw new Error("Please sign in again to continue.");
    const r = await fetch(`http://localhost:5001/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": schoolId,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const p = await r.json().catch(() => null);
    if (r.status === 401)
      throw new Error("Your session has expired. Please sign in again.");
    if (!r.ok)
      throw new Error(
        Array.isArray(p?.message)
          ? p.message.join(", ")
          : p?.message || "Request failed.",
      );
    return p;
  };
  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [g, m, a, d, l, studentApplications] = await Promise.all([
        request("game-assessments/generated-games"),
        request("game-assessments/game-mapping"),
        request("game-assessments"),
        request("game-assessments/analytics/dashboard"),
        request("game-assessments/gamification/leaderboard"),
        request("application"),
      ]);
      setGames(g);
      setMapping(m);
      setAssessments(a);
      setAnalytics(d);
      setLeaderboard(l);
      setStudents(
        (studentApplications || []).filter((student: Row) =>
          student.assessmentRequired !== false &&
          !["DRAFT", "REJECTED", "WITHDRAWN"].includes(String(student.status || "").toUpperCase()),
        ),
      );
      setError("");
    } catch (e) {
      setError(msg(e));
    } finally {
      if (!quiet) setLoading(false);
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("step") === "assign") {
      setTab("assign");
      setAssignment((current) => ({
        ...current,
        generatedGameId: params.get("gameId") || "",
        gameAssessmentId: params.get("assessmentId") || "",
      }));
    }
    void load();
    const timer = window.setInterval(() => void load(true), 8000);
    return () => window.clearInterval(timer);
  }, []);
  const approved = useMemo(
    () =>
      mapping.mappings?.filter((m: Row) => m.question?.status === "APPROVED") ||
      [],
    [mapping],
  );
  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === assignment.gameAssessmentId),
    [assessments, assignment.gameAssessmentId],
  );
  const eligibleStudents = useMemo(
    () => students.filter((student) => student.assessmentRequired !== false && (!selectedAssessment?.ageGroup || matchesAgeGroup(student.studentDob, selectedAssessment.ageGroup))),
    [students, selectedAssessment],
  );
  const publishedGames = useMemo(
    () => games.filter((game) => game.status === "PUBLISHED"),
    [games],
  );
  useEffect(() => {
    if (assignment.deliveryMode !== "SCHOOL" || !selectedAssessment?.ageGroup) {
      setSchoolVenue(null);
      return;
    }
    let cancelled = false;
    setVenueLoading(true);
    request(`game-assessments/assignment-venue?ageGroup=${encodeURIComponent(selectedAssessment.ageGroup)}`)
      .then((venue) => {
        if (!cancelled) setSchoolVenue(venue ? {
          ...venue,
          startTime: toTimeInput(venue.startTime),
          endTime: toTimeInput(venue.endTime),
        } : emptySchoolVenue());
      })
      .catch((e) => { if (!cancelled) setError(msg(e)); })
      .finally(() => { if (!cancelled) setVenueLoading(false); });
    return () => { cancelled = true; };
  }, [assignment.deliveryMode, selectedAssessment?.ageGroup]);
  const assessmentChoices = useMemo(() => {
    const unique = new Map<string, Row>();
    [...assessments]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime(),
      )
      .forEach((assessment) => {
        const label = assessment.name || assessment.title || "Untitled assessment";
        const key = `${label.trim().toLowerCase()}::${String(assessment.ageGroup || "").trim().toLowerCase()}`;
        if (!unique.has(key) || assessment.id === assignment.gameAssessmentId) {
          unique.set(key, assessment);
        }
      });
    return [...unique.values()];
  }, [assessments, assignment.gameAssessmentId]);
  const generate = async () => {
    if (!selected.length) return;
    setBusy("generate");
    try {
      const first = approved.find((m: Row) => selected.includes(m.questionId));
      await request("game-assessments/generated-games/generate", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title || "Generated Learning Game",
          templateId: form.templateId || first?.selectedTemplateId,
          questionIds: selected,
          configuration: first?.configuration || {
            timerSeconds: 30,
            lives: 3,
            hints: 3,
          },
        }),
      });
      setSelected([]);
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };
  const operate = async (game: Row, action: string) => {
    setBusy(game.id + action);
    try {
      const p = await request(
        `game-assessments/generated-games/${game.id}/${action}`,
        { method: "POST", body: "{}" },
      );
      if (action === "preview") setRuntime(p);
      else await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };
  const removeGame = async (game: Row) => {
    if (!window.confirm(`Delete "${game.title}"? This also removes its assignments, play sessions, and results.`)) return;
    setBusy(game.id + "delete");
    setError("");
    try {
      await request(`game-assessments/generated-games/${game.id}`, { method: "DELETE" });
      if (runtime?.generatedGameId === game.id) setRuntime(null);
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };
  const assign = async () => {
    if (assignment.deliveryMode === "SCHOOL" && (!schoolVenue?.assessmentDate || !schoolVenue?.campus || !schoolVenue?.building || !schoolVenue?.roomNumber || !schoolVenue?.startTime || !schoolVenue?.endTime)) {
      setError("Enter the at-school date, time, campus, building, and room before assigning the game.");
      return;
    }
    setBusy("assign");
    setError("");
    setSuccess("");
    try {
      const { deliveryMode, ...assignmentPayload } = assignment;
      const result = await request("game-assessments/game-assignments", {
        method: "POST",
        body: JSON.stringify({
          ...assignmentPayload,
          targetIds: assignment.targetIds
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          settings: { deliveryMode, ...(deliveryMode === "SCHOOL" && { location: schoolVenue }) },
        }),
      });
      const student = students.find((row) => row.id === assignment.targetIds);
      setSuccess(
        result.alreadyAssigned
          ? `This game was already assigned to ${student?.studentFirstName || "the selected student"}; its delivery mode is now ${deliveryMode === "SCHOOL" ? "At School" : "Home"}.`
          : `Game assigned to ${student?.studentFirstName || "the selected student"} successfully for ${deliveryMode === "SCHOOL" ? "At School" : "Home"} delivery.`,
      );
      await load();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#071633] to-[#007f70] p-5 shadow-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <Link
              href="/admin/game-assessments"
              className="keep-white inline-flex items-center gap-1 text-xs font-bold opacity-80"
            >
              <ArrowLeft className="keep-white h-4 w-4" /> Game-Based Assessments
            </Link>
            <h1 className="keep-white mt-3 text-2xl font-black">Game Studio</h1>
            <p className="keep-white mt-1 text-xs opacity-80">
              Create, preview, publish, and assign playable games.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[
            ["games", "Games", Gamepad2],
            ["assign", "Assign", Users],
            ["analytics", "Results", BarChart3],
          ].map(([k, l, I]: any) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${tab === k ? "bg-white text-[#007f70]" : "keep-white border border-white/20 bg-white/10"}`}
            >
              <I
                className={`h-4 w-4 ${tab === k ? "text-[#007f70]" : "keep-white"}`}
              />
              {l}
            </button>
          ))}
        </div>
      </header>
      {error && (
        <div role="alert" className="game-assessment-alert game-assessment-alert--error flex items-center justify-between rounded-xl border p-3 text-xs font-semibold">
          <span>{error}</span>
          <div className="flex items-center gap-3">
            {error.includes("sign in") && (
              <Link href="/login" className="font-black underline">
                Sign in
              </Link>
            )}
            <button onClick={() => setError("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {tab === "games" && (
        <>
          <section className="hidden" aria-hidden="true">
            <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <h2 className="text-sm font-black">Create a game</h2>
                <input
                  className="input mt-3"
                  placeholder="Game title (optional)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <select
                  className="input mt-2"
                  value={form.engineKey}
                  onChange={(e) =>
                    setForm({ ...form, engineKey: e.target.value })
                  }
                >
                  {[
                    "QUIZ_CHALLENGE",
                    "BALLOON_POP",
                    "SHOOTING_GAME",
                    "MEMORY_MATCH",
                    "DRAG_DROP",
                    "SEQUENCE_GAME",
                    "MAZE",
                    "ENDLESS_RUNNER",
                    "TREASURE_HUNT",
                    "SPIN_WHEEL",
                    "BASKETBALL_CHALLENGE",
                    "FOOTBALL_GOAL_QUIZ",
                  ].map((x) => (
                    <option key={x} value={x}>
                      {title(x)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={generate}
                  disabled={!selected.length || !!busy}
                  className="keep-white mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] py-3 text-xs font-black hover:bg-[#006b5e] disabled:opacity-50"
                >
                  {busy === "generate" ? (
                    <Loader2 className="keep-white h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="keep-white h-4 w-4" />
                  )}
                  Create game
                  {selected.length ? ` · ${selected.length} questions` : ""}
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black">
                    Choose approved questions
                  </h2>
                  {approved.length > 0 && (
                    <button
                      onClick={() =>
                        setSelected(
                          selected.length === approved.length
                            ? []
                            : approved.map((m: Row) => m.questionId),
                        )
                      }
                      className="text-xs font-bold text-[#007f70]"
                    >
                      {selected.length === approved.length
                        ? "Clear"
                        : "Select all"}
                    </button>
                  )}
                </div>
                {approved.length ? (
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                    {approved.map((m: Row) => (
                      <label
                        key={m.questionId}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-xs ${selected.includes(m.questionId) ? "border-[#70cbb9] bg-[#eaf8f4]" : "border-slate-100 bg-slate-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(m.questionId)}
                          onChange={() =>
                            setSelected(
                              selected.includes(m.questionId)
                                ? selected.filter((x) => x !== m.questionId)
                                : [...selected, m.questionId],
                            )
                          }
                        />
                        <span>
                          <b>{m.question.questionText}</b>
                          <small className="mt-1 block text-slate-500">
                            {m.selectedTemplate.name} ·{" "}
                            {title(m.question.difficulty)}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-[#b8ddd5] bg-[#f4fbf9] p-6 text-center">
                    <p className="text-xs font-bold text-slate-600">
                      No approved mapped questions yet.
                    </p>
                    <Link
                      href="/admin/game-assessments/questions"
                      className="mt-3 inline-flex rounded-lg bg-white px-3 py-2 text-xs font-black text-[#007f70] shadow-sm"
                    >
                      Prepare questions
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
          {games.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {games.map((g) => (
                <article
                  key={g.id}
                  className="rounded-2xl border border-[#dceae6] bg-white p-5 shadow-sm"
                >
                  <div className="flex justify-between">
                    <Gamepad2 className="h-6 w-6 text-[#007f70]" />
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${g.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {title(g.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 font-black">{g.title}</h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {title(g.engineKey)} · v{g.version} · {g.questionIds.length}{" "}
                    questions
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => operate(g, "preview")}
                      className="studio-btn"
                    >
                      <Eye /> Preview
                    </button>
                    {g.status === "PUBLISHED" && (
                      <button
                        onClick={() => {
                          setAssignment((current) => ({
                            ...current,
                            generatedGameId: g.id,
                            gameAssessmentId:
                              g.gameAssessmentId || current.gameAssessmentId,
                          }));
                          setTab("assign");
                        }}
                        className="studio-btn bg-emerald-50 text-emerald-700"
                      >
                        <Users /> Assign
                      </button>
                    )}
                    {g.status !== "PUBLISHED" && (
                      <>
                        <button
                          onClick={() => operate(g, "regenerate")}
                          className="studio-btn"
                        >
                          <RefreshCcw /> Regenerate
                        </button>
                        <button
                          onClick={() => operate(g, "publish")}
                          className="studio-btn bg-emerald-50 text-emerald-700"
                        >
                          <CheckCircle2 /> Publish
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => void removeGame(g)}
                      disabled={busy === g.id + "delete"}
                      className="studio-btn studio-btn--danger disabled:opacity-50"
                    >
                      {busy === g.id + "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="rounded-2xl border border-dashed border-[#b8ddd5] bg-white p-8 text-center">
                <Gamepad2 className="mx-auto h-8 w-8 text-[#007f70]" />
                <p className="mt-3 text-sm font-black">No games created yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Create a game assessment first. Questions will be prepared
                  automatically.
                </p>
                <Link
                  href="/admin/game-assessments"
                  className="mt-4 inline-flex rounded-xl bg-[#007f70] px-4 py-2.5 text-xs font-black text-white"
                >
                  Create game
                </Link>
              </div>
            )
          )}
        </>
      )}
      {tab === "assign" && (
        <section className="mx-auto max-w-3xl rounded-2xl border border-[#dceae6] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-black">Assign a game</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Choose a published game, its assessment, and the student who should receive it.
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4">
            <h3 className="flex items-center gap-2 text-xs font-black text-[#071633]">
              <span className="keep-white flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007f70] text-xs font-black shadow-sm ring-2 ring-[#bde8df]">1</span>
              Choose game and assessment
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Published game">
                <select
                  className="input"
                  value={assignment.generatedGameId}
                  onChange={(e) => {
                    const game = games.find((row) => row.id === e.target.value);
                    setAssignment({
                      ...assignment,
                      generatedGameId: e.target.value,
                      gameAssessmentId: game?.gameAssessmentId || "",
                      targetIds: "",
                    });
                    setSuccess("");
                  }}
                >
                  <option value="">
                    {publishedGames.length ? "Select a game" : "No published games available"}
                  </option>
                  {publishedGames.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title} · {title(game.engineKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assessment">
                <select
                  className="input"
                  value={assignment.gameAssessmentId}
                  onChange={(e) => {
                    const assessment = assessments.find((row) => row.id === e.target.value);
                    setAssignment({
                      ...assignment,
                      gameAssessmentId: e.target.value,
                      targetIds: "",
                      deliveryMode: assessment?.assessmentMode === "SCHOOL" ? "SCHOOL" : "HOME",
                    });
                    setSuccess("");
                  }}
                >
                  <option value="">
                    {assessmentChoices.length ? "Select an assessment" : "No assessments available"}
                  </option>
                  {assessmentChoices.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.name || assessment.title || "Untitled assessment"}
                      {assessment.ageGroup ? ` · ${assessment.ageGroup}` : ""}
                      {` · ${assessment.assessmentMode === "SCHOOL" ? "At School" : "Home"}`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {assignment.generatedGameId && assignment.gameAssessmentId && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-800">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Game and assessment selected</span>
                <span className="rounded-full bg-white px-2.5 py-1 font-black uppercase tracking-wide text-[#007f70]">
                  Assessment default: {selectedAssessment?.assessmentMode === "SCHOOL" ? "At School" : "Home"}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-[#dceae6] p-4">
            <h3 className="flex items-center gap-2 text-xs font-black text-[#071633]">
              <span className="keep-white flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007f70] text-xs font-black shadow-sm ring-2 ring-[#bde8df]">2</span>
              Choose delivery mode
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["HOME", "Home", "Student can play remotely from the portal."],
                ["SCHOOL", "At School", "Game is assigned for supervised play at school."],
              ].map(([value, label, description]) => {
                const selected = assignment.deliveryMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAssignment({ ...assignment, deliveryMode: value })}
                    className={`rounded-xl border p-3 text-left transition ${selected ? "border-[#008c78] bg-[#e6f7f2] shadow-sm" : "border-[#dceae6] bg-white hover:border-[#9fd5cc]"}`}
                  >
                    <span className={`block text-xs font-black ${selected ? "text-[#006f63]" : "text-[#071633]"}`}>{label}</span>
                    <span className="mt-1 block text-[9px] font-semibold leading-4 text-[#71818d]">{description}</span>
                  </button>
                );
              })}
            </div>
            {assignment.deliveryMode === "SCHOOL" && (
              <div className="mt-4 rounded-xl border border-[#b9ddd6] bg-[#f4fbf9] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-black text-[#006f63]">
                      <MapPin className="h-4 w-4" /> At-school location
                    </p>
                    <p className="mt-1 text-[9px] font-semibold text-[#71818d]">
                      Enter a location for this game, or review the values prefilled from a matching written assessment.
                    </p>
                  </div>
                  {schoolVenue?.sourceAssessment && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-[#007f70]">
                      From written assessment
                    </span>
                  )}
                </div>
                {venueLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#607580]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#008f80]" /> Loading school location…
                  </div>
                ) : schoolVenue ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Assessment date *">
                      <input className="input" type="date" value={schoolVenue.assessmentDate || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, assessmentDate: e.target.value })} />
                    </Field>
                    <Field label="Start time *">
                      <input className="input" type="time" value={schoolVenue.startTime || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, startTime: e.target.value, slotName: schoolVenue.slotName || "Game Session" })} />
                    </Field>
                    <Field label="End time *">
                      <input className="input" type="time" value={schoolVenue.endTime || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, endTime: e.target.value, slotName: schoolVenue.slotName || "Game Session" })} />
                    </Field>
                    <Field label="Campus *">
                      <input className="input" placeholder="e.g. Main Campus" value={schoolVenue.campus || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, campus: e.target.value })} />
                    </Field>
                    <Field label="Building *">
                      <input className="input" placeholder="e.g. Block A" value={schoolVenue.building || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, building: e.target.value })} />
                    </Field>
                    <Field label="Floor">
                      <input className="input" placeholder="e.g. Ground Floor" value={schoolVenue.floor || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, floor: e.target.value })} />
                    </Field>
                    <Field label="Room number *">
                      <input className="input" placeholder="e.g. Room 101" value={schoolVenue.roomNumber || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, roomNumber: e.target.value })} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Venue notes">
                        <input className="input" placeholder="e.g. Computer lab beside the library" value={schoolVenue.venue || ""} onChange={(e) => setSchoolVenue({ ...schoolVenue, venue: e.target.value })} />
                      </Field>
                    </div>
                    {schoolVenue.sourceAssessment && <p className="text-[9px] font-semibold text-[#607580] sm:col-span-2 lg:col-span-3">Prefilled from: {schoolVenue.sourceAssessment}. You can edit these values for this game.</p>}
                  </div>
                ) : (
                  <button type="button" onClick={() => setSchoolVenue(emptySchoolVenue())} className="mt-4 rounded-lg border border-[#b9ddd6] bg-white px-3 py-2 text-[10px] font-bold text-[#007f70]">Enter game location</button>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-[#dceae6] p-4">
            <h3 className="flex items-center gap-2 text-xs font-black text-[#071633]">
              <span className="keep-white flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007f70] text-xs font-black shadow-sm ring-2 ring-[#bde8df]">3</span>
              Choose student
            </h3>
            <div className="mt-3">
              <Field label={selectedAssessment?.ageGroup ? `Eligible students (${selectedAssessment.ageGroup})` : "Student"}>
                <select
                  className="input"
                  value={assignment.targetIds}
                  disabled={!assignment.generatedGameId || !assignment.gameAssessmentId || eligibleStudents.length === 0}
                  onChange={(e) => {
                    setAssignment({ ...assignment, targetIds: e.target.value });
                    setSuccess("");
                  }}
                >
                  <option value="">
                    {!assignment.generatedGameId
                      ? "Select a game first"
                      : !assignment.gameAssessmentId
                        ? "Select an assessment first"
                        : eligibleStudents.length
                          ? "Select a student"
                          : `No students available in ${selectedAssessment?.ageGroup || "this assessment"}`}
                  </option>
                  {eligibleStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.studentFirstName} {student.studentLastName} — {selectedAssessment?.ageGroup}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          {success && <div role="status" className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-extrabold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> {success}</div>}
          {error && <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-extrabold text-rose-700">{error}</div>}
          <button type="button" onClick={() => setShowAssignmentSettings(!showAssignmentSettings)} className="mt-3 text-[10px] font-extrabold text-[#007f70] underline">
            {showAssignmentSettings ? "Hide optional settings" : "Change attempts or passing score (optional)"}
          </button>
          {showAssignmentSettings && <div className="mt-3 grid gap-3 rounded-xl border border-[#dceae6] bg-[#fafdfc] p-3 sm:grid-cols-2">
            <Field label="Attempts">
              <input
                className="input"
                type="number"
                min={1}
                value={assignment.maxAttempts}
                onChange={(e) =>
                  setAssignment({
                    ...assignment,
                    maxAttempts: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Passing score">
              <input
                className="input"
                type="number"
                min={0}
                max={100}
                value={assignment.passingScore}
                onChange={(e) =>
                  setAssignment({
                    ...assignment,
                    passingScore: Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>}
          <button
            onClick={assign}
            disabled={
              !assignment.generatedGameId ||
              !assignment.gameAssessmentId ||
              !assignment.targetIds.trim() ||
              !!busy
            }
            className="keep-white mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] py-3 text-xs font-black hover:bg-[#006b5e] disabled:opacity-50"
          >
            <Send className="keep-white h-4 w-4" />
            {busy === "assign" ? "Assigning…" : "Assign game to student"}
          </button>
        </section>
      )}
      {tab === "analytics" && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(analytics.summary || {}).map(([k, v]) => (
              <div key={k} className="rounded-2xl border bg-white p-4">
                <p className="text-xl font-black">
                  {typeof v === "number" ? Math.round(v) : String(v)}
                </p>
                <p className="text-[9px] font-bold uppercase text-slate-400">
                  {k.replace(/([A-Z])/g, " $1")}
                </p>
              </div>
            ))}
          </section>
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="text-sm font-black">Game performance</h2>
              <div className="mt-4 space-y-3">
                {analytics.byGame?.map((g: Row) => (
                  <div key={g.game}>
                    <div className="flex justify-between text-xs">
                      <b>{g.game}</b>
                      <span>{Math.round(g.averagePercentage)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${g.averagePercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <Trophy className="h-4 w-4 text-amber-500" />
                Leaderboard
              </h2>
              {leaderboard.map((p, i) => (
                <div
                  key={p.studentId}
                  className="mt-3 flex justify-between rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <span>
                    #{i + 1} · {p.studentId.slice(0, 8)}
                  </span>
                  <b>
                    {p.xp} XP · L{p.level}
                  </b>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
      {runtime && (
        <GameRuntimePlayer
          initial={runtime}
          request={request}
          onClose={() => setRuntime(null)}
        />
      )}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
function msg(e: unknown) {
  return e instanceof Error ? e.message : "Operation failed.";
}
function title(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (x) => x.toUpperCase());
}
