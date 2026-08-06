"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Eye,
  Gamepad2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import FollowTheLightsGame from "@/games/follow-the-lights/Game";

type Game = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  ageGroup: string;
  difficulty: string;
  durationSeconds: number;
  componentName: string;
  gameType: string;
  status: string;
  isActive: boolean;
  updatedAt: string;
  assignmentCount?: number;
};
type Student = {
  id: string;
  studentFirstName: string;
  studentLastName: string;
  ageGroup: string;
  status: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const AGE_GROUPS = ["3–4 Years", "4–5 Years", "5–7 Years", "7–9 Years", "9–11 Years", "11–13 Years", "13–16 Years"];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [menu, setMenu] = useState("");
  const [editing, setEditing] = useState<Partial<Game> | null>(null);
  const [assigning, setAssigning] = useState<Game | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [previewing, setPreviewing] = useState<Game | null>(null);

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        "x-tenant-id": localStorage.getItem("schoolId") || "",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(
        Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message || "Request failed.",
      );
    return payload;
  };

  const load = async () => {
    setLoading(true);
    try {
      setGames(await request("games"));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load games.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const value = query.trim().toLowerCase();
    const matchingAgeGroup = ageGroupFilter ? games.filter((game) => game.ageGroup === ageGroupFilter) : games;
    return value
      ? matchingAgeGroup.filter((game) =>
          [game.name, game.category, game.gameType].some((field) =>
            field.toLowerCase().includes(value),
          ),
        )
      : matchingAgeGroup;
  }, [ageGroupFilter, games, query]);

  const save = async () => {
    if (
      !editing?.name?.trim() ||
      !editing.category?.trim() ||
      !editing.componentName?.trim()
    ) {
      setError("Name, category, and component name are required.");
      return;
    }
    if (!editing.id) return;
    setBusy(editing.id);
    setError("");
    try {
      await request(`games/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          category: editing.category,
          ageGroup: editing.ageGroup,
          difficulty: editing.difficulty,
          durationSeconds: Number(editing.durationSeconds),
        }),
      });
      setEditing(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save game.",
      );
    } finally {
      setBusy("");
    }
  };

  const toggle = async (game: Game) => {
    setBusy(game.id);
    setMenu("");
    try {
      await request(`games/${game.id}/toggle`, { method: "PATCH" });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update game.",
      );
    } finally {
      setBusy("");
    }
  };

  const remove = async (game: Game) => {
    if (!window.confirm(`Remove ${game.name} from Games?`)) return;
    setBusy(game.id);
    setMenu("");
    try {
      await request(`games/${game.id}`, { method: "DELETE" });
      setGames((current) => current.filter((item) => item.id !== game.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to remove game.",
      );
    } finally {
      setBusy("");
    }
  };

  const openAssignment = async (game: Game) => {
    setAssigning(game);
    setSelectedStudents([]);
    setStudentLoading(true);
    setError("");
    try {
      const rows = await request(
        `games/${game.id}/eligible-students?ageGroup=${encodeURIComponent(game.ageGroup)}`,
      );
      setStudents(rows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load eligible students.",
      );
    } finally {
      setStudentLoading(false);
    }
  };

  const assign = async () => {
    if (!assigning || !selectedStudents.length) return;
    setBusy("assign");
    setError("");
    try {
      await request(`games/${assigning.id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          ageGroup: assigning.ageGroup,
          studentIds: selectedStudents,
        }),
      });
      setAssigning(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to assign game.",
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 border-b border-[#dceae6] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#008f7d]">
            <Gamepad2 className="h-3.5 w-3.5" /> Standalone games
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#071633] sm:text-3xl">
            Real-time Games
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#607080]">
            Assign live games to students who match each game’s eligible age group.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold">
          <span className="rounded-full border border-[#cae7df] bg-white px-3 py-1.5 text-[#526574]">
            <b className="mr-1 text-[#071633]">{games.length}</b> games
          </span>
          <span className="rounded-full border border-[#cae7df] bg-white px-3 py-1.5 text-[#526574]">
            <b className="mr-1 text-[#071633]">
              {games.reduce(
                (sum, game) => sum + (game.assignmentCount || 0),
                0,
              )}
            </b>{" "}
            assignments
          </span>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <section className="overflow-visible rounded-2xl border border-[#dceae6] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5efec] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black text-[#071633]">Available games</p>
            <p className="mt-1 text-[9px] text-[#7b8d98]">
              Developer-registered games ready for school assignment
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <select value={ageGroupFilter} onChange={(event) => setAgeGroupFilter(event.target.value)} className="rounded-xl border border-[#dceae6] bg-[#f9fcfb] px-3 py-2.5 text-xs outline-none focus:border-[#009b87]">
            <option value="">All Age Groups</option>
            {AGE_GROUPS.map((ageGroup) => <option key={ageGroup} value={ageGroup}>{ageGroup}</option>)}
          </select>
          <label className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#82939e]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-[#dceae6] bg-[#f9fcfb] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#009b87]"
            />
          </label>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-72 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#009b87]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="grid min-h-[420px] place-items-center px-6 py-16 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[#d8ebe6] bg-[#f0f8f5] text-[#008f7d]">
                <Gamepad2 className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-lg font-black text-[#071633]">
                {query ? "No matching games" : "No real-time games yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#71818d]">
                {query
                  ? "Try another name or category."
                  : "Developer-registered real-time games will appear here automatically."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e8f0ee]">
            {visible.map((game) => (
              <article
                key={game.id}
                className="relative flex flex-col gap-4 px-5 py-5 transition hover:bg-[#fbfdfc] lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#e3f8f2] to-[#d8efff] text-[#008f7d]">
                    <Gamepad2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-[#071633]">
                        {game.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[7px] font-black uppercase ${game.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${game.isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {game.isActive ? "Live" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#81919c]">
                      {game.description || game.componentName}
                    </p>
                    <p className="mt-2 text-[8px] font-black uppercase tracking-wider text-[#8fa0aa]">
                      {game.category} · {Math.round(game.durationSeconds / 60)}{" "}
                      minute session
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[540px]">
                  <div className="rounded-xl bg-[#f7faf9] px-3 py-2">
                    <p className="text-[7px] font-black uppercase tracking-wide text-[#95a3ac]">
                      Age Group
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-black text-violet-700">
                      <Users className="h-3 w-3" />
                      {game.ageGroup}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7faf9] px-3 py-2">
                    <p className="text-[7px] font-black uppercase tracking-wide text-[#95a3ac]">
                      Assigned
                    </p>
                    <p className="mt-1 text-[10px] font-black text-[#071633]">
                      {game.assignmentCount || 0} batches
                    </p>
                  </div>
                  <button
                    disabled={!game.isActive}
                    onClick={() => setPreviewing(game)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#b9dcd4] bg-white px-4 py-2.5 text-[10px] font-black text-[#007f70] transition hover:bg-[#f0f8f5] disabled:opacity-40"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button
                    disabled={!game.isActive}
                    onClick={() => void openAssignment(game)}
                    className="keep-white inline-flex items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-2.5 text-[10px] font-black transition hover:bg-[#006b5e] disabled:opacity-40"
                  >
                    <Send className="keep-white h-3.5 w-3.5" /> Assign
                  </button>
                </div>
                <div className="relative">
                  <button
                    disabled={busy === game.id}
                    onClick={() => setMenu(menu === game.id ? "" : game.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-[#607080] hover:bg-[#eaf7f3] hover:text-[#007f70]"
                  >
                    {busy === game.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </button>
                  {menu === game.id && (
                    <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border border-[#dceae6] bg-white p-1.5 shadow-xl">
                      <MenuButton
                        icon={<Pencil />}
                        label="Edit details"
                        onClick={() => {
                          setEditing({ ...game });
                          setMenu("");
                        }}
                      />
                      <MenuButton
                        icon={<Power />}
                        label={game.isActive ? "Disable" : "Enable"}
                        onClick={() => void toggle(game)}
                      />
                      <MenuButton
                        danger
                        icon={<Trash2 />}
                        label="Remove"
                        onClick={() => void remove(game)}
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title="Edit real-time game" onClose={() => setEditing(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Game name"
              value={editing.name || ""}
              onChange={(value) => setEditing({ ...editing, name: value })}
            />
            <Field
              label="Category"
              value={editing.category || ""}
              onChange={(value) => setEditing({ ...editing, category: value })}
            />
            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Age Group</span>
              <select className="input" value={editing.ageGroup || ""} onChange={(event) => setEditing({ ...editing, ageGroup: event.target.value })}>
                {AGE_GROUPS.map((ageGroup) => <option key={ageGroup} value={ageGroup}>{ageGroup}</option>)}
              </select>
            </label>
            <Field
              label="Duration (seconds)"
              type="number"
              value={String(editing.durationSeconds || 300)}
              onChange={(value) =>
                setEditing({ ...editing, durationSeconds: Number(value) })
              }
            />
            <div className="sm:col-span-2">
              <Field
                label="Description"
                value={editing.description || ""}
                onChange={(value) =>
                  setEditing({ ...editing, description: value })
                }
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-[#dceae6] px-4 py-2.5 text-xs font-bold text-[#607080]"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#007f70] px-5 py-2.5 text-xs font-black text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save game
            </button>
          </div>
        </Modal>
      )}
      {assigning && (
        <Modal
          title={`Assign ${assigning.name}`}
          onClose={() => setAssigning(null)}
        >
          <div className="relative overflow-hidden rounded-2xl border border-[#cde8e1] bg-gradient-to-br from-[#f3fbf8] via-white to-[#eef7ff] p-4 sm:p-5">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#00a88f]/10" />
            <div className="relative flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#007f70] text-white shadow-lg shadow-[#007f70]/20">
                <Gamepad2 className="keep-white h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[#071633]">
                  {assigning.name}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#6f818d]">
                  Assign this game only to students in its eligible age group.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-black text-violet-700">
                    <Users className="h-3 w-3" /> {assigning.ageGroup}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-black text-[#071633]">
                Choose students
              </p>
              <p className="mt-1 text-[9px] text-[#81919c]">
                Showing eligible {assigning.ageGroup} students ·{" "}
                {selectedStudents.length} selected
              </p>
            </div>
            {students.length > 0 && (
              <button
                onClick={() =>
                  setSelectedStudents(
                    selectedStudents.length === students.length
                      ? []
                      : students.map((student) => student.id),
                  )
                }
                className="text-[9px] font-black text-[#007f70]"
              >
                {selectedStudents.length === students.length
                  ? "Clear all"
                  : "Select all"}
              </button>
            )}
          </div>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {studentLoading ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#009b87]" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex items-center gap-4 rounded-2xl border border-[#d7e7e3] bg-[#f7fbfa] p-4 text-left">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#6e9f95] shadow-sm ring-1 ring-[#dcebe7]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#344b5c]">
                    No eligible {assigning.ageGroup} students
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-[#82939e]">
                    Eligible students will appear here automatically when
                    available.
                  </p>
                </div>
              </div>
            ) : (
              students.map((student) => {
                const checked = selectedStudents.includes(student.id);
                return (
                  <button
                    key={student.id}
                    onClick={() =>
                      setSelectedStudents((current) =>
                        checked
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id],
                      )
                    }
                    aria-pressed={checked}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${checked ? "border-[#21a48e] bg-[#edf9f5] shadow-sm ring-1 ring-[#21a48e]/15" : "border-[#e0ebe8] bg-white hover:border-[#a9d4ca] hover:bg-[#fbfdfc]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-black ${checked ? "bg-[#007f70] text-white" : "bg-[#eef4f2] text-[#607080]"}`}
                      >
                        {student.studentFirstName[0]}
                        {student.studentLastName[0]}
                      </span>
                      <div>
                        <p className="text-[10px] font-black text-[#071633]">
                          {student.studentFirstName} {student.studentLastName}
                        </p>
                        <p className="mt-0.5 text-[8px] font-bold text-[#81919c]">
                          {student.ageGroup} · {student.status}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide ${checked ? "text-[#007f70]" : "text-[#9aabb4]"}`}
                    >
                      {checked && "Selected"}
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-md border ${checked ? "border-[#008f7d] bg-[#008f7d] text-white" : "border-[#cbdad6] bg-white"}`}
                      >
                        {checked && (
                          <CheckCircle2 className="keep-white h-3.5 w-3.5" />
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-5 flex flex-col gap-3 border-t border-[#e5efec] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[9px] font-bold text-[#71818d]">
              <span
                className={`grid h-7 w-7 place-items-center rounded-lg ${selectedStudents.length ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
              >
                {selectedStudents.length ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </span>
              {selectedStudents.length
                ? `${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} ready`
                : "Select at least one student"}
            </div>
            <button
              onClick={() => void assign()}
              disabled={!selectedStudents.length || busy === "assign"}
              className="keep-white inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#007f70] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#007f70]/15 transition hover:bg-[#006b5e] disabled:cursor-not-allowed disabled:bg-[#dbe8e5] disabled:text-[#8ba19b] disabled:shadow-none"
            >
              {busy === "assign" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}{" "}
              {selectedStudents.length
                ? `Assign to ${selectedStudents.length}`
                : "Select students to assign"}
            </button>
          </div>
        </Modal>
      )}
      {previewing &&
        createPortal(
          <div className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden bg-[#071633]">
            <div className="keep-white absolute left-4 top-4 z-[110] rounded-full bg-[#071633]/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider backdrop-blur">
              School preview · results are not saved
            </div>
            <button
              onClick={() => setPreviewing(null)}
              className="keep-white absolute right-4 top-4 z-[110] grid h-10 w-10 place-items-center rounded-full bg-[#071633]/80 backdrop-blur transition hover:bg-[#071633]"
              aria-label="Close preview"
            >
              <X className="keep-white h-5 w-5" />
            </button>
            {previewing.componentName === "FOLLOW_THE_LIGHTS" ? (
              <FollowTheLightsGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : (
              <div className="grid h-full place-items-center text-center text-white">
                <div>
                  <Gamepad2 className="mx-auto h-10 w-10" />
                  <p className="mt-3 text-sm font-black">
                    Preview is not available for this game runtime.
                  </p>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] font-bold transition disabled:opacity-40 ${danger ? "!bg-rose-50 !text-rose-600 hover:!bg-rose-100 hover:!text-rose-700" : "!bg-transparent !text-[#526574] hover:!bg-[#f0f8f5] hover:!text-[#007f70]"}`}
    >
      <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
      {label}
    </button>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-[10px] font-bold text-[#526574]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#dceae6] px-3 py-2.5 text-xs outline-none focus:border-[#009b87]"
      />
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#071633]/55 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={onClose}
    >
      <section
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_30px_80px_rgba(7,22,51,0.28)] sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between border-b border-[#edf2f1] pb-4">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#008f7d]">
              Game assignment
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-[#071633]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f5f4] text-[#607080] transition hover:bg-[#e4efec] hover:text-[#071633]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
