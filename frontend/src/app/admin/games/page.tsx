"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Gamepad2,
  Loader2,
  ListChecks,
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
import BallStackGame from "@/games/ball-stack/Game";
import SoundDetectiveGame from "@/games/sound-detective/Game";
import ColorPathGame from "@/games/color-path/Game";
import MagicPaintGame from "@/games/magic-paint/Game";
import TrainTrackBuilderGame from "@/games/train-track-builder/Game";
import PackageSorterGame from "@/games/package-sorter/Game";
import MagicTrainGame from "@/games/magic-train/Game";
import RescueMissionGame from "@/games/rescue-mission/Game";
import ParkingEscapeGame from "@/games/parking-escape/Game";
import WaterPipelineGame from "@/games/water-pipeline/Game";
import PatternMatrixGame from "@/games/pattern-matrix/Game";
import NumberBuilderGame from "@/games/number-builder/Game";
import BallSortGame from "@/games/ball-sort/Game";
import RedLightGreenLightGame from "@/games/red-light-green-light/Game";
import CatchTheTargetGame from "@/games/catch-the-target/Game";
import MentalRotationGame from "@/games/mental-rotation/Game";
import WaterJugsGame from "@/games/water-jugs/Game";
import TangramBuilderGame from "@/games/tangram-builder/Game";
import SokobanGame from "@/games/sokoban/Game";
import ColorShiftGame from "@/games/color-shift/Game";
import AirHockeyChallengeGame from "@/games/air-hockey-challenge/Game";
import MemoryMarketGame from "@/games/memory-market/Game";
import AirportControllerGame from "@/games/airport-controller/Game";
import RuleShiftChallengeGame from "@/games/rule-shift-challenge/Game";
import MiniGolfGame from "@/games/mini-golf/Game";
import RacingStrategistGame from "@/games/racing-strategist/Game";

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
  thumbnail?: string;
  cognitiveSkill?: string;
};
type Student = {
  id: string;
  studentFirstName: string;
  studentLastName: string;
  ageGroup: string;
  grade?: string;
  status: string;
  allGamesAssigned?: boolean;
};
type GameAttempt = {
  id: string;
  attemptNumber: number;
  status: string;
  percentage?: number | null;
  completedAt?: string | null;
  timeTaken?: number | null;
  analytics?: Record<string, number | string>;
};
type GameReview = {
  id: string;
  status: string;
  percentage: number;
  totalScore: number;
  passed: boolean | null;
  reviewStatus: string;
  schoolReview?: string;
  recommendation?: string;
  completedAt?: string;
  student?: {
    id?: string;
    studentFirstName: string;
    studentLastName: string;
    grade: string;
  };
  gameName?: string;
  componentName?: string;
  performanceMetrics?: Record<string, number | string>;
  allowedReassessments?: number;
  attemptHistory?: GameAttempt[];
};
type BulkGame = Pick<
  Game,
  "id" | "name" | "category" | "ageGroup" | "durationSeconds" | "componentName"
> & { alreadyAssigned: boolean };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const AGE_GROUPS = [
  "3–4 Years",
  "4–5 Years",
  "5–7 Years",
  "7–9 Years",
  "9–11 Years",
  "11–13 Years",
  "13–16 Years",
];

const isHiddenGame = (game: Game) =>
  game.name.trim().toLowerCase().startsWith("traffic control");

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
  const [reviews, setReviews] = useState<GameReview[]>([]);
  const [success, setSuccess] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);
  const [bulkStudentIds, setBulkStudentIds] = useState<string[]>([]);
  const [bulkGames, setBulkGames] = useState<BulkGame[]>([]);
  const [selectedBulkGames, setSelectedBulkGames] = useState<string[]>([]);
  const [allowedReassessments, setAllowedReassessments] = useState(0);
  const [allResultsOpen, setAllResultsOpen] = useState(false);

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
      const loadedGames: Game[] = await request("games");
      setGames(loadedGames.filter((game) => !isHiddenGame(game)));
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
    const matchingAgeGroup = ageGroupFilter
      ? games.filter((game) => game.ageGroup === ageGroupFilter)
      : games;
    return value
      ? matchingAgeGroup.filter((game) =>
          [game.name, game.category, game.gameType].some((field) =>
            field.toLowerCase().includes(value),
          ),
        )
      : matchingAgeGroup;
  }, [ageGroupFilter, games, query]);

  const resultGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        grade: string;
        results: Array<GameReview & { gameId?: string }>;
      }
    >();
    for (const result of reviews as Array<GameReview & { gameId?: string }>) {
      if (!["REVIEWED", "NEEDS_FOLLOW_UP"].includes(result.reviewStatus))
        continue;
      const name = result.student
        ? `${result.student.studentFirstName} ${result.student.studentLastName}`.trim()
        : "Student";
      const key =
        result.student?.id || `${name}:${result.student?.grade || ""}`;
      const group = groups.get(key) || {
        key,
        name,
        grade: result.student?.grade || "",
        results: [],
      };
      group.results.push(result);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [reviews]);

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
    setAllowedReassessments(0);
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
          allowedReassessments,
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

  const openAllResults = async () => {
    setAllResultsOpen(true);
    setBusy("reviews");
    setError("");
    try {
      const rows = await Promise.all(
        games.map(async (game) => {
          const gameReviews = (await request(
            `games/${game.id}/reviews`,
          )) as GameReview[];
          return gameReviews.map((result) => ({
            ...result,
            gameId: game.id,
            gameName: result.gameName || game.name,
          }));
        }),
      );
      setReviews(
        rows
          .flat()
          .sort(
            (a, b) =>
              new Date(b.completedAt || 0).getTime() -
              new Date(a.completedAt || 0).getTime(),
          ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load game results.",
      );
      setReviews([]);
    } finally {
      setBusy("");
    }
  };

  const openBulkAssign = async () => {
    setSuccess("");
    const gamesForAge = games.filter(
      (game) =>
        (!ageGroupFilter || game.ageGroup === ageGroupFilter) && game.isActive,
    );
    const ageGroupLabel = ageGroupFilter || "all age groups";
    if (!gamesForAge.length) {
      setError(`No active games are available for ${ageGroupLabel}.`);
      return;
    }
    setError("");
    setBulkOpen(true);
    setBulkStudentIds([]);
    setBulkGames([]);
    setSelectedBulkGames([]);
    setStudentLoading(true);
    try {
      setBulkStudents(
        await request(
          `games/bulk-eligible-students?ageGroup=${encodeURIComponent(ageGroupFilter || "ALL")}`,
        ),
      );
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

  const chooseBulkStudent = async (studentId: string) => {
    const nextStudentIds = bulkStudentIds.includes(studentId)
      ? bulkStudentIds.filter((id) => id !== studentId)
      : [...bulkStudentIds, studentId];
    setBulkStudentIds(nextStudentIds);
    if (!nextStudentIds.length) {
      setBulkGames([]);
      setSelectedBulkGames([]);
      setBusy("");
      return;
    }

    setBusy("bulk-options");
    try {
      const payloads = await Promise.all(
        nextStudentIds.map((id) =>
          request(
            `games/bulk-assignment-options?ageGroup=${encodeURIComponent(ageGroupFilter || "ALL")}&studentId=${encodeURIComponent(id)}`,
          ),
        ),
      );
      const merged = new Map<
        string,
        BulkGame & { eligibleStudents: number; assignedStudents: number }
      >();
      for (const payload of payloads)
        for (const game of (payload.games || []) as BulkGame[]) {
          const current = merged.get(game.id);
          if (current) {
            current.eligibleStudents += 1;
            if (game.alreadyAssigned) current.assignedStudents += 1;
          } else
            merged.set(game.id, {
              ...game,
              eligibleStudents: 1,
              assignedStudents: game.alreadyAssigned ? 1 : 0,
            });
        }
      const rows = [...merged.values()].map((game) => ({
        ...game,
        alreadyAssigned: game.assignedStudents >= game.eligibleStudents,
      }));
      setBulkGames(rows);
      setSelectedBulkGames(
        rows.filter((game) => !game.alreadyAssigned).map((game) => game.id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load bulk assignment options.",
      );
    } finally {
      setBusy("");
    }
  };

  const bulkAssign = async () => {
    if (!bulkStudentIds.length || !selectedBulkGames.length) return;
    setBusy("bulk-assign");
    setError("");
    try {
      const result = await request("games/bulk-assign", {
        method: "POST",
        body: JSON.stringify({
          ageGroup: ageGroupFilter || "ALL",
          studentIds: bulkStudentIds,
          gameIds: selectedBulkGames,
          allowedReassessments,
        }),
      });
      setSuccess(result.message);
      setBulkOpen(false);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to assign the selected games.",
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      <header className="relative overflow-hidden rounded-[28px] border border-[#cfe9e2] bg-gradient-to-br from-[#073c42] via-[#006f68] to-[#00a68e] px-6 py-7 shadow-[0_18px_50px_rgba(0,93,82,.16)] sm:px-8 sm:py-8">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[42px] border-white/5" />
        <div className="absolute bottom-[-90px] right-[22%] h-56 w-56 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#a7fff0]">
              <Gamepad2 className="h-3.5 w-3.5" /> Cognitive game library
            </div>
            <h1 className="keep-white text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
              Real-time Games
            </h1>
            <p className="keep-white mt-2 max-w-xl text-xs font-medium leading-5 text-white/85">
              Preview assessment experiences, review eligible age groups, and
              assign games to matched students.
            </p>
          </div>
          <div className="flex gap-2">
            <DashboardStat value={games.length} label="Active games" />
            <DashboardStat
              value={games.reduce(
                (sum, game) => sum + (game.assignmentCount || 0),
                0,
              )}
              label="Assignments"
            />
          </div>
        </div>
      </header>

      {error && (
        <div
          className="games-error-alert flex items-center justify-between gap-4 rounded-xl px-4 py-3"
          role="alert"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold">
              {error === "Failed to fetch"
                ? "Unable to connect to the Games service. Please try again."
                : error}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="games-error-retry shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black"
          >
            Retry
          </button>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <section className="overflow-visible rounded-[24px] border border-[#d8e9e5] bg-white shadow-[0_12px_40px_rgba(7,40,45,.06)]">
        <div className="flex flex-col justify-between gap-4 border-b border-[#e5efec] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-base font-black tracking-tight text-[#071633]">
              Available assessments
            </p>
            <p className="mt-1 text-[10px] text-[#7b8d98]">
              {visible.length} of {games.length} games shown
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={ageGroupFilter}
              onChange={(event) => setAgeGroupFilter(event.target.value)}
              className="min-h-11 rounded-xl border border-[#d5e7e2] bg-white px-3 py-2.5 text-xs font-bold text-[#304754] shadow-sm outline-none focus:border-[#009b87] focus:ring-4 focus:ring-[#009b87]/10"
            >
              <option value="">All Age Groups</option>
              {AGE_GROUPS.map((ageGroup) => (
                <option key={ageGroup} value={ageGroup}>
                  {ageGroup}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void openBulkAssign()}
              className="keep-white inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#006b5e]"
            >
              <ListChecks className="keep-white h-4 w-4" /> Assign All Games
            </button>
            <button
              type="button"
              onClick={() => void openAllResults()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#8fcfc1] bg-[#f0faf7] px-4 py-2.5 text-[10px] font-black text-[#007f70] shadow-sm transition hover:bg-[#e5f6f1]"
            >
              <ListChecks className="h-4 w-4" /> Results
            </button>
            <label className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#82939e]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search games or skills"
                className="min-h-11 w-full rounded-xl border border-[#d5e7e2] bg-white py-2.5 pl-9 pr-3 text-xs shadow-sm outline-none focus:border-[#009b87] focus:ring-4 focus:ring-[#009b87]/10"
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
          <div className="grid gap-4 bg-[#f7faf9] p-4 sm:p-5 lg:grid-cols-2">
            {visible.map((game) => (
              <article
                key={game.id}
                className="group relative overflow-visible rounded-[22px] border border-[#dce9e6] bg-white p-4 shadow-[0_4px_18px_rgba(7,35,42,.04)] transition duration-300 hover:-translate-y-1 hover:border-[#a7d8cd] hover:shadow-[0_18px_38px_rgba(7,75,68,.12)] sm:p-5"
              >
                <div
                  className={`relative mb-4 flex h-28 items-center overflow-hidden rounded-2xl bg-gradient-to-br ${gameCardTheme(game.componentName)}`}
                >
                  <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[24px] border-white/20" />
                  <div className="absolute bottom-[-42px] left-[24%] h-24 w-40 rotate-[-8deg] rounded-[50%] bg-white/15" />
                  <GameArtwork componentName={game.componentName} />
                  <div className="relative z-10 ml-4 min-w-0 pr-4">
                    <p className="keep-white text-[9px] font-black uppercase tracking-[.16em] text-white/80">
                      {game.category}
                    </p>
                    <p className="keep-white mt-1 text-sm font-black leading-tight text-white">
                      {game.cognitiveSkill || game.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-black tracking-tight text-[#071633]">
                      {game.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 min-h-9 text-[10px] font-medium leading-[18px] text-[#526b78]">
                      {game.description || game.componentName}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      aria-label={`More options for ${game.name}`}
                      disabled={busy === game.id}
                      onClick={() => setMenu(menu === game.id ? "" : game.id)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[#e0ebe8] text-[#607080] transition hover:border-[#b9dcd4] hover:bg-[#eaf7f3] hover:text-[#007f70]"
                    >
                      {busy === game.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </button>
                    {menu === game.id && (
                      <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-[#dceae6] bg-white p-1.5 shadow-xl">
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
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <GameMeta
                    label="Age group"
                    value={game.ageGroup}
                    icon={<Users />}
                    accent
                  />
                  <GameMeta
                    label="Duration"
                    value={`${Math.round(game.durationSeconds / 60)} min`}
                  />
                  <GameMeta
                    label="Assigned"
                    value={`${game.assignmentCount || 0} batches`}
                  />
                </div>
                <div className="mt-4 border-t border-[#e8f0ee] pt-4">
                  <button
                    disabled={!game.isActive}
                    onClick={() => setPreviewing(game)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#b9dcd4] bg-white px-4 py-2.5 text-[10px] font-black text-[#007f70] transition hover:border-[#008f7d] hover:bg-[#f0f8f5] disabled:opacity-40"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
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
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                Age Group
              </span>
              <select
                className="input"
                value={editing.ageGroup || ""}
                onChange={(event) =>
                  setEditing({ ...editing, ageGroup: event.target.value })
                }
              >
                {AGE_GROUPS.map((ageGroup) => (
                  <option key={ageGroup} value={ageGroup}>
                    {ageGroup}
                  </option>
                ))}
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
      {bulkOpen && (
        <Modal
          title={`Assign all ${ageGroupFilter} games`}
          onClose={() => setBulkOpen(false)}
        >
          <div
            className="mb-5 flex items-center gap-2"
            aria-label="Assignment progress"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#eaf7f3] px-3 py-2.5 text-[#007f70]">
              <span className="keep-white grid h-6 w-6 place-items-center rounded-full bg-[#007f70] text-[9px] font-black text-white">
                1
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider">
                Choose student
              </span>
            </div>
            <div
              className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 ${bulkStudentIds.length ? "bg-[#eaf7f3] text-[#007f70]" : "bg-[#f4f7f6] text-[#93a29f]"}`}
            >
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[9px] font-black ${bulkStudentIds.length ? "keep-white bg-[#007f70] text-white" : "bg-[#dfe8e5] text-[#657773]"}`}
              >
                2
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider">
                Review games
              </span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-[#cde8e1] bg-gradient-to-br from-[#edf9f5] to-white p-4 sm:p-5">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#00a88f]/10" />
            <div className="relative flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#007f70] text-white shadow-md shadow-[#007f70]/20">
                <Users className="keep-white h-5 w-5" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#008f7d]">
                  Eligible age group
                </p>
                <p className="mt-1 text-base font-black text-[#071633]">
                  {ageGroupFilter || "All Age Groups"}
                </p>
                <p className="mt-0.5 text-[9px] text-[#71818d]">
                  Only matching students and games are shown.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#071633]">
                  Choose students
                </p>
                <p className="mt-1 text-[9px] text-[#81919c]">
                  Select one or more students to see their available games.
                </p>
              </div>
              <span className="rounded-full bg-[#f0f5f4] px-2.5 py-1 text-[8px] font-black text-[#647771]">
                {bulkStudents.length} eligible
              </span>
            </div>
            {studentLoading ? (
              <div className="grid h-24 place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#007f70]" />
              </div>
            ) : bulkStudents.length === 0 ? (
              <div className="mt-3 rounded-xl border border-[#d7e7e3] bg-[#f7fbfa] p-4 text-xs font-bold text-[#71818d]">
                No eligible {ageGroupFilter || "all-age-group"} students are
                available.
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {bulkStudents.map((student) => {
                  const selected = bulkStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      disabled={student.allGamesAssigned}
                      aria-pressed={selected}
                      onClick={() => void chooseBulkStudent(student.id)}
                      className={`group flex items-center justify-between rounded-xl border p-3 text-left transition ${student.allGamesAssigned ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-65" : selected ? "border-[#008f7d] bg-[#edf9f5] shadow-sm ring-1 ring-[#008f7d]/20" : "border-[#dce9e6] bg-white hover:border-[#9dccbf] hover:bg-[#fbfdfc]"}`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-full text-[9px] font-black ${selected ? "keep-white bg-[#007f70] text-white" : "bg-[#edf3f1] text-[#607080]"}`}
                        >
                          {student.studentFirstName[0]}
                          {student.studentLastName[0]}
                        </span>
                        <span>
                          <span className="block text-[10px] font-black text-[#071633]">
                            {student.studentFirstName} {student.studentLastName}
                          </span>
                          <span className="mt-1 block text-[8px] font-bold uppercase tracking-wide text-[#667c89]">
                            {student.grade || student.ageGroup} ·{" "}
                            {student.status}
                          </span>
                        </span>
                      </span>
                      {student.allGamesAssigned ? (
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[8px] font-black text-slate-600">
                          Already assigned
                        </span>
                      ) : (
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full border transition ${selected ? "keep-white border-[#007f70] bg-[#007f70] text-white" : "border-[#cbdad6] bg-white group-hover:border-[#76b9aa]"}`}
                        >
                          {selected && (
                            <CheckCircle2 className="keep-white h-4 w-4" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {bulkStudentIds.length > 0 && (
            <div className="mt-5 border-t border-[#e5efec] pt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#071633]">
                  Games for{" "}
                  {ageGroupFilter || "the selected student's age group"}
                </p>
                {bulkGames.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedBulkGames(
                        bulkGames
                          .filter((game) => !game.alreadyAssigned)
                          .map((game) => game.id),
                      )
                    }
                    className="text-[9px] font-black text-[#007f70]"
                  >
                    Select all available
                  </button>
                )}
              </div>
              {busy === "bulk-options" ? (
                <div className="grid h-28 place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#007f70]" />
                </div>
              ) : (
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                  {bulkGames.map((game) => {
                    const selected = selectedBulkGames.includes(game.id);
                    return (
                      <button
                        key={game.id}
                        disabled={game.alreadyAssigned}
                        onClick={() =>
                          setSelectedBulkGames((current) =>
                            selected
                              ? current.filter((id) => id !== game.id)
                              : [...current, game.id],
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${game.alreadyAssigned ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70" : selected ? "border-[#008f7d] bg-[#edf9f5]" : "border-[#dce9e6] bg-white"}`}
                      >
                        <div>
                          <p className="text-[10px] font-black text-[#071633]">
                            {game.name}
                          </p>
                          <p className="mt-1 text-[8px] font-medium text-[#667c89]">
                            {game.category} · {game.ageGroup}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[8px] font-black ${game.alreadyAssigned ? "bg-slate-200 text-slate-600" : selected ? "keep-white bg-[#007f70] text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
                        >
                          {game.alreadyAssigned
                            ? "Already Assigned"
                            : selected
                              ? "Selected"
                              : "Not selected"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {bulkStudentIds.length > 0 && bulkGames.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[#dce9e6] bg-[#f7faf9] p-4 text-[10px]">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Summary
                  label="Selected Age Group"
                  value={ageGroupFilter || "All Age Groups"}
                />
                <Summary
                  label="Students"
                  value={`${bulkStudentIds.length} selected`}
                />
                <Summary label="Total Games" value={String(bulkGames.length)} />
                <Summary
                  label="Selected Games"
                  value={String(selectedBulkGames.length)}
                />
              </div>
              <label className="mt-4 block">
                <span className="text-[9px] font-black uppercase tracking-wide text-[#607080]">
                  Reassessments Allowed
                </span>
                <select
                  value={allowedReassessments}
                  onChange={(event) =>
                    setAllowedReassessments(Number(event.target.value))
                  }
                  className="mt-2 w-full rounded-xl border border-[#d5e7e2] bg-white px-3 py-2.5 text-xs font-bold text-[#071633]"
                >
                  {[0, 1, 2, 3, 5].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-[9px] leading-4 text-[#71818d]">
                  Students can retake each selected game up to{" "}
                  {allowedReassessments} additional{" "}
                  {allowedReassessments === 1 ? "time" : "times"}. No approval
                  is required. Total possible attempts:{" "}
                  {1 + allowedReassessments}.
                </span>
              </label>
              <button
                onClick={() => void bulkAssign()}
                disabled={!selectedBulkGames.length || busy === "bulk-assign"}
                className="keep-white mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-5 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                {busy === "bulk-assign" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}{" "}
                Assign All
              </button>
            </div>
          )}
          {!bulkStudentIds.length && (
            <div className="mt-5 flex flex-col gap-3 border-t border-[#e5efec] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[9px] font-bold text-[#71818d]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f0f4f3] text-[#8b9b97]">
                  <Users className="h-4 w-4" />
                </span>
                Select one or more students to continue
              </p>
              <button
                disabled
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#dbe8e5] px-5 text-xs font-black text-[#8ba19b]"
              >
                <Send className="h-4 w-4" /> Continue to games
              </button>
            </div>
          )}
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
          <label className="mt-4 block rounded-xl border border-[#dce9e6] bg-[#f7faf9] p-4">
            <span className="text-[9px] font-black uppercase tracking-wide text-[#607080]">
              Reassessments Allowed
            </span>
            <select
              value={allowedReassessments}
              onChange={(event) =>
                setAllowedReassessments(Number(event.target.value))
              }
              className="mt-2 w-full rounded-xl border border-[#d5e7e2] bg-white px-3 py-2.5 text-xs font-bold text-[#071633]"
            >
              {[0, 1, 2, 3, 5].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-[9px] leading-4 text-[#71818d]">
              After the first attempt, the student can retake this game up to{" "}
              {allowedReassessments} additional{" "}
              {allowedReassessments === 1 ? "time" : "times"}. No approval
              request is required.
            </span>
            <b className="mt-1 block text-[10px] text-[#007f70]">
              Total possible attempts: {1 + allowedReassessments}
            </b>
          </label>
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
                          {student.grade || student.ageGroup} · {student.status}
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
      {allResultsOpen && (
        <Modal
          title="Games results & assessment history"
          onClose={() => setAllResultsOpen(false)}
        >
          {busy === "reviews" ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#007f70]" />
            </div>
          ) : resultGroups.length === 0 ? (
            <div className="rounded-2xl border border-[#d7e7e3] bg-[#f7fbfa] p-6 text-center text-xs font-bold text-[#71818d]">
              No assignments or results yet. Assign this game to a student
              first.
            </div>
          ) : (
            <div className="space-y-4">
              {resultGroups.map((group) => {
                const completed = group.results.filter(
                  (result) => result.status === "COMPLETED",
                );
                const average = completed.length
                  ? completed.reduce(
                      (sum, result) => sum + Number(result.percentage || 0),
                      0,
                    ) / completed.length
                  : 0;
                const best = completed.length
                  ? Math.max(
                      ...completed.map((result) =>
                        Number(result.percentage || 0),
                      ),
                    )
                  : 0;
                const reviewed = group.results.filter(
                  (result) => result.reviewStatus !== "PENDING",
                ).length;
                return (
                  <details
                    key={group.key}
                    className="group overflow-hidden rounded-2xl border border-[#cfe3de] bg-white shadow-[0_8px_24px_rgba(7,56,49,.06)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition hover:bg-[#f7fbfa] [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="keep-white grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#006f62] to-[#10a990] text-sm font-black !text-white shadow-md">
                          {group.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-[#071633]">
                            {group.name}
                          </h3>
                          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#526474]">
                            {group.grade || "Student"} · {group.results.length}{" "}
                            game{group.results.length === 1 ? "" : "s"} assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-5">
                        <div className="hidden text-right sm:block">
                          <p className="text-lg font-black text-[#007f70]">
                            {Math.round(average)}%
                          </p>
                          <p className="text-[8px] font-black uppercase text-[#81919c]">
                            Average
                          </p>
                        </div>
                        <div className="hidden text-right md:block">
                          <p className="text-sm font-black text-[#071633]">
                            {Math.round(best)}%
                          </p>
                          <p className="text-[8px] font-black uppercase text-[#81919c]">
                            Best
                          </p>
                        </div>
                        <div className="hidden text-right lg:block">
                          <p className="text-sm font-black text-[#071633]">
                            {reviewed}/{group.results.length}
                          </p>
                          <p className="text-[8px] font-black uppercase text-[#81919c]">
                            Reviewed
                          </p>
                        </div>
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf7f4] text-[#007f70] transition group-open:rotate-90">
                          ›
                        </span>
                      </div>
                    </summary>
                    <div className="grid items-start gap-3 border-t border-[#e1ece9] bg-[#f7faf9] p-4 lg:grid-cols-2">
                      {group.results.map(
                        (result: GameReview & { gameId?: string }) => (
                          <div
                            key={result.id}
                            className="self-start rounded-2xl border border-[#dce9e6] bg-white p-4 shadow-[0_3px_12px_rgba(7,56,49,.04)]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-[#071633]">
                                  {result.gameName || "Game assessment"}
                                </p>
                                <p className="mt-1 text-[9px] font-medium text-[#71818d]">
                                  {result.student?.grade ||
                                    group.grade ||
                                    "Student"}{" "}
                                  · {result.status.replaceAll("_", " ")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black leading-none text-[#007f70]">
                                  {result.status === "COMPLETED"
                                    ? `${Math.round(result.percentage)}%`
                                    : "—"}
                                </p>
                                <p
                                  className={`mt-1.5 inline-flex rounded-full px-2 py-1 text-[7px] font-black uppercase ${result.reviewStatus === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-[#e9f7f3] text-[#007f70]"}`}
                                >
                                  {result.reviewStatus.replaceAll("_", " ")}
                                </p>
                              </div>
                            </div>
                            {result.status === "COMPLETED" && (
                              <MetricGrid
                                metrics={result.performanceMetrics || {}}
                                compact
                              />
                            )}
                            {result.attemptHistory &&
                              result.attemptHistory.length > 0 &&
                              (() => {
                                const history = result.attemptHistory || [];
                                const completed = history.filter(
                                  (attempt) => attempt.status === "COMPLETED",
                                );
                                const first = Number(
                                  completed[0]?.percentage || 0,
                                );
                                const latest = Number(
                                  completed[completed.length - 1]?.percentage ||
                                    0,
                                );
                                const best = completed.length
                                  ? Math.max(
                                      ...completed.map((attempt) =>
                                        Number(attempt.percentage || 0),
                                      ),
                                    )
                                  : 0;
                                const remaining = Math.max(
                                  0,
                                  1 +
                                    Number(result.allowedReassessments || 0) -
                                    history.length,
                                );
                                return (
                                  <details className="group/history mt-3 overflow-hidden rounded-xl border border-[#b9ddd5] bg-[#f5fbf9]">
                                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[10px] font-black text-[#007f70] [&::-webkit-details-marker]:hidden">
                                      <span>Assessment history</span>
                                      <span className="flex items-center gap-2">
                                        <span className="rounded-full bg-white px-2 py-1 text-[8px] text-[#526474]">
                                          {history.length} attempt
                                          {history.length === 1 ? "" : "s"}
                                        </span>
                                        <span className="text-sm transition group-open/history:rotate-90">
                                          ›
                                        </span>
                                      </span>
                                    </summary>
                                    <div className="border-t border-[#cfe6e0] px-4 pb-4 pt-3">
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <p className="text-[10px] font-black text-[#071633]">
                                          {completed
                                            .map(
                                              (attempt) =>
                                                `Attempt ${attempt.attemptNumber}`,
                                            )
                                            .join(" → ")}
                                        </p>
                                        <p className="text-[10px] font-bold text-[#007f70]">
                                          {completed
                                            .map(
                                              (attempt) =>
                                                `${Math.round(Number(attempt.percentage || 0))}%`,
                                            )
                                            .join(" → ")}
                                        </p>
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-white p-3 text-[9px] sm:grid-cols-3">
                                        <Summary
                                          label="First"
                                          value={`${Math.round(first)}%`}
                                        />
                                        <Summary
                                          label="Latest"
                                          value={`${Math.round(latest)}%`}
                                        />
                                        <Summary
                                          label="Best"
                                          value={`${Math.round(best)}%`}
                                        />
                                        <Summary
                                          label="Improvement"
                                          value={`${latest - first >= 0 ? "+" : ""}${Math.round(latest - first)} pts`}
                                        />
                                        <Summary
                                          label="Attempts used"
                                          value={String(history.length)}
                                        />
                                        <Summary
                                          label="Remaining"
                                          value={String(remaining)}
                                        />
                                      </div>
                                      <div className="mt-3 space-y-2">
                                        {history.map((attempt) => (
                                          <details
                                            key={String(attempt.id)}
                                            className="group/attempt overflow-hidden rounded-lg border border-[#dce9e6] bg-white"
                                          >
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-[9px] font-black text-[#071633] [&::-webkit-details-marker]:hidden">
                                              <span>
                                                Attempt {attempt.attemptNumber}{" "}
                                                ·{" "}
                                                {attempt.percentage == null
                                                  ? "In progress"
                                                  : `${Math.round(Number(attempt.percentage))}%`}
                                              </span>
                                              <span className="flex items-center gap-1 text-[#007f70]">
                                                Details{" "}
                                                <span className="text-xs transition group-open/attempt:rotate-90">
                                                  ›
                                                </span>
                                              </span>
                                            </summary>
                                            <div className="border-t border-[#e5efec] px-3 pb-3 pt-2 text-[9px] leading-5 text-[#607080]">
                                              <div className="flex flex-wrap justify-between gap-2">
                                                <p>
                                                  {attempt.completedAt
                                                    ? new Date(
                                                        String(
                                                          attempt.completedAt,
                                                        ),
                                                      ).toLocaleString()
                                                    : "Not completed"}
                                                </p>
                                                <p>
                                                  Time:{" "}
                                                  {attempt.timeTaken == null
                                                    ? "—"
                                                    : `${Math.floor(Number(attempt.timeTaken) / 60)}m ${Number(attempt.timeTaken) % 60}s`}
                                                </p>
                                              </div>
                                              <MetricGrid
                                                metrics={
                                                  (attempt.analytics ||
                                                    {}) as Record<
                                                    string,
                                                    number | string
                                                  >
                                                }
                                                compact
                                              />
                                            </div>
                                          </details>
                                        ))}
                                      </div>
                                    </div>
                                  </details>
                                );
                              })()}
                            {result.schoolReview && (
                              <div className="mt-3 rounded-xl bg-[#f3f8f7] p-3">
                                <p className="text-[8px] font-black uppercase text-[#81919c]">
                                  School review
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[#405762]">
                                  {result.schoolReview}
                                </p>
                              </div>
                            )}
                            {result.recommendation && (
                              <div className="mt-2 rounded-xl bg-[#f3f8f7] p-3">
                                <p className="text-[8px] font-black uppercase text-[#81919c]">
                                  Recommended next steps
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-[#405762]">
                                  {result.recommendation}
                                </p>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
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
            ) : previewing.componentName === "BALL_STACK" ? (
              <BallStackGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "SOUND_DETECTIVE" ? (
              <SoundDetectiveGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "COLOR_PATH" ? (
              <ColorPathGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "MAGIC_PAINT" ? (
              <MagicPaintGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "TRAIN_TRACK_BUILDER" ? (
              <TrainTrackBuilderGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "PACKAGE_SORTER" ? (
              <PackageSorterGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "MAGIC_TRAIN" ? (
              <MagicTrainGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "RESCUE_MISSION" ? (
              <RescueMissionGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "PARKING_ESCAPE" ? (
              <ParkingEscapeGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "BALL_SORT" ? (
              <BallSortGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "RED_LIGHT_GREEN_LIGHT" ? (
              <RedLightGreenLightGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "WATER_PIPELINE" ? (
              <WaterPipelineGame
                sound
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "PATTERN_MATRIX" ? (
              <PatternMatrixGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "NUMBER_BUILDER" ? (
              <NumberBuilderGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "CATCH_THE_TARGET" ? (
              <CatchTheTargetGame
                durationSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "MENTAL_ROTATION" ? (
              <MentalRotationGame
                remainingSeconds={previewing.durationSeconds}
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "WATER_JUGS" ? (
              <WaterJugsGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "TANGRAM_BUILDER" ? (
              <TangramBuilderGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "SOKOBAN" ? (
              <SokobanGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "COLOR_SHIFT" ? (
              <ColorShiftGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "AIR_HOCKEY_CHALLENGE" ? (
              <AirHockeyChallengeGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "MEMORY_MARKET" ? (
              <MemoryMarketGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "AIRPORT_CONTROLLER" ? (
              <AirportControllerGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "RULE_SHIFT_CHALLENGE" ? (
              <RuleShiftChallengeGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "RACING_STRATEGIST" ? (
              <RacingStrategistGame
                remainingSeconds={previewing.durationSeconds}
                practiceOnly
                onComplete={() => setPreviewing(null)}
              />
            ) : previewing.componentName === "MINI_GOLF_CHALLENGE" ? (
              <MiniGolfGame remainingSeconds={previewing.durationSeconds} practiceOnly onComplete={() => setPreviewing(null)} />
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

function DashboardStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="keep-white min-w-28 rounded-2xl border border-white/25 bg-[#064f50]/45 px-4 py-3 text-white shadow-sm backdrop-blur-sm">
      <p className="keep-white text-xl font-black leading-none text-white">
        {value}
      </p>
      <p className="keep-white mt-1.5 text-[8px] font-black uppercase tracking-[.14em] text-white/80">
        {label}
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-wide text-[#81919c]">
        {label}
      </p>
      <p className="mt-1 font-black text-[#071633]">{value}</p>
    </div>
  );
}

function MetricGrid({
  metrics,
  compact = false,
}: {
  metrics: Record<string, number | string>;
  compact?: boolean;
}) {
  const entries = Object.entries(metrics).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  const visible = compact ? entries.slice(0, 4) : entries;
  if (!visible.length)
    return (
      <p className="mt-3 text-[9px] font-bold text-[#81919c]">
        Detailed analytics are being processed.
      </p>
    );
  const compactColumns =
    visible.length === 1
      ? "grid-cols-1"
      : visible.length === 2
        ? "grid-cols-2"
        : visible.length === 3
          ? "grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";
  return (
    <div
      className={`mt-3 grid gap-2 ${compact ? compactColumns : "grid-cols-2 sm:grid-cols-3"}`}
    >
      {visible.map(([key, value]) => (
        <div
          key={key}
          className="flex min-w-0 flex-col justify-center rounded-xl border border-[#deebe8] bg-white px-2 py-2.5 text-center"
        >
          <p className="min-h-6 [overflow-wrap:anywhere] text-[7px] font-black uppercase leading-3 tracking-normal text-[#81919c]">
            {metricLabel(key)}
          </p>
          <p className="mt-1 text-[11px] font-black text-[#173244]">
            {metricValue(key, value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function metricLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("average", "Avg.")
    .replaceAll("Percentage", "%");
}

function metricValue(key: string, value: number | string) {
  if (typeof value === "string") return value.replaceAll("_", " ");
  if (/time/i.test(key))
    return `${value >= 100 ? (value / 1000).toFixed(2) : value.toFixed(2)}${value >= 100 ? "s" : "s"}`;
  if (
    /score|percentage|accuracy|alignment|consistency|attention|memory|potential|stability|efficiency/i.test(
      key,
    )
  )
    return `${Math.round(value * 10) / 10}%`;
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 10) / 10);
}

function GameArtwork({ componentName }: { componentName: string }) {
  const common =
    "relative z-10 ml-5 grid h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-white/60 bg-white/90 shadow-lg transition duration-300 group-hover:scale-[1.04]";
  if (componentName === "BALL_STACK")
    return (
      <div className={`${common} place-items-center`} aria-hidden>
        <span className="absolute inset-x-0 top-2.5 text-center text-[8px] font-black tracking-[.16em] text-[#37616a]">
          BALANCE • PLACE
        </span>
        <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 flex-col-reverse items-center drop-shadow-md">
          <i className="h-4 w-20 rounded-full bg-[#27b99d] ring-2 ring-white" />
          <i className="-mb-0.5 h-4 w-16 rounded-full bg-[#f3c84b] ring-2 ring-white" />
          <i className="-mb-0.5 h-4 w-12 rounded-full bg-[#f27668] ring-2 ring-white" />
          <i className="-mb-0.5 h-4 w-8 rounded-full bg-[#6b5bd2] ring-2 ring-white" />
        </div>
      </div>
    );
  if (componentName === "FOLLOW_THE_LIGHTS")
    return (
      <div
        className={`${common} place-items-center bg-[#101d45]/90`}
        aria-hidden
      >
        <div className="grid grid-cols-2 gap-3">
          {["#ffcf4a", "#64d9be", "#ed6f79", "#738dff"].map((color, index) => (
            <i
              key={color}
              className={`h-8 w-8 rounded-full border-4 border-white/80 shadow-[0_0_18px_currentColor] ${index === 1 ? "scale-110" : "opacity-75"}`}
              style={{ backgroundColor: color, color }}
            />
          ))}
        </div>
        <span className="keep-white absolute bottom-2 text-[8px] font-black tracking-widest text-white">
          WATCH • REMEMBER
        </span>
      </div>
    );
  if (componentName === "SOUND_DETECTIVE")
    return (
      <div className={`${common} place-items-center bg-[#fff8e8]`} aria-hidden>
        <div className="flex h-12 items-center gap-1">
          {[18, 34, 48, 28, 42, 22, 38].map((height, index) => (
            <i
              key={index}
              className="w-2 rounded-full bg-gradient-to-t from-[#d85d31] to-[#f3b83f]"
              style={{ height }}
            />
          ))}
        </div>
        <span className="absolute left-3 top-3 text-2xl">🎧</span>
        <span className="absolute bottom-2 text-[8px] font-black tracking-widest text-[#8b4a2a]">
          LISTEN • IDENTIFY
        </span>
      </div>
    );
  if (componentName === "COLOR_PATH")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#ddf7ff] to-[#b7e995]`}
        aria-hidden
      >
        <span className="absolute left-[18px] top-[30px] text-3xl">🐻</span>
        {["#ef4444", "#22c55e", "#3b82f6", "#facc15"].map((color, index) => (
          <i
            key={color}
            className="absolute bottom-5 h-5 w-9 rounded-[50%] border-2 border-white shadow"
            style={{
              backgroundColor: color,
              left: 50 + index * 25,
              transform: `translateY(${index % 2 ? -12 : 0}px)`,
            }}
          />
        ))}
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-[#31555c]">
          COLOR PATH
        </span>
      </div>
    );
  if (componentName === "MAGIC_PAINT")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#c9f3ff] to-[#a6e383]`}
        aria-hidden
      >
        <span className="absolute left-1/2 top-4 -translate-x-1/2 text-5xl">
          🦋
        </span>
        {["#ff4f64", "#19c37d", "#3b82f6", "#ffd229", "#9b5de5"].map(
          (paint, index) => (
            <i
              key={paint}
              className="absolute bottom-3 h-5 w-5 rounded-full border-2 border-white"
              style={{ backgroundColor: paint, left: 35 + index * 24 }}
            />
          ),
        )}
      </div>
    );
  if (componentName === "TRAIN_TRACK_BUILDER")
    return (
      <div
        className={`${common} place-items-center bg-gradient-to-b from-[#c9f2ff] to-[#8fd17b]`}
        aria-hidden
      >
        <span className="absolute left-2 top-5 text-4xl">🚂</span>
        <span className="absolute right-2 top-5 text-4xl">🏁</span>
        <i className="absolute bottom-6 left-10 right-8 h-2 rounded bg-slate-600 shadow-[0_-7px_0_#d9e1df,0_7px_0_#d9e1df]" />
        <span className="absolute bottom-1 text-[8px] font-black tracking-widest text-[#31555c]">
          BUILD • CONNECT
        </span>
      </div>
    );
  if (componentName === "PACKAGE_SORTER")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#ffe4e6] to-[#fecdd3]`}
        aria-hidden
      >
        <span className="absolute left-3 top-3 text-3xl">📦</span>
        <span className="absolute right-3 top-3 text-3xl">🚚</span>
        <span className="absolute bottom-2 text-[8px] font-black tracking-widest text-[#9f1239]">
          SORT • DELIVER
        </span>
      </div>
    );
  if (componentName === "MAGIC_TRAIN")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#bdeeff] to-[#86ce7b]`}
        aria-hidden
      >
        <span className="absolute left-3 top-6 text-4xl">🚂</span>
        <div className="absolute bottom-7 left-14 flex gap-1">
          {["#ff6178", "#ffd34e", "#48a9f8"].map((color) => (
            <i
              key={color}
              className="h-7 w-9 rounded-md border-2 border-white shadow"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <i className="absolute bottom-5 left-2 right-2 h-1.5 rounded bg-slate-600" />
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-[#31555c]">
          WATCH • BUILD
        </span>
      </div>
    );
  if (componentName === "RESCUE_MISSION")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#99e7f4] to-[#82d17d]`}
        aria-hidden
      >
        <span className="absolute bottom-3 left-3 text-4xl">🧑‍🚒</span>
        <span className="absolute right-4 top-3 text-4xl">🐱</span>
        <span className="absolute bottom-2 right-12 -rotate-6 text-4xl">
          🪜
        </span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-[#24545c]">
          CHOOSE • ADAPT • RESCUE
        </span>
      </div>
    );
  if (componentName === "PARKING_ESCAPE")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#8dd9f0] to-[#425563]`}
        aria-hidden
      >
        <span className="absolute bottom-4 left-3 text-4xl">🚗</span>
        <span className="absolute left-1/2 top-3 -translate-x-1/2 text-4xl">
          🚙
        </span>
        <span className="absolute bottom-3 right-3 text-4xl">➡️</span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-white">
          PLAN • MOVE • ESCAPE
        </span>
      </div>
    );
  if (componentName === "BALL_SORT")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#b19ffa] to-[#6d4df6]`}
        aria-hidden
      >
        <span className="absolute bottom-4 left-3 text-4xl">🧪</span>
        <span className="absolute right-4 top-3 text-4xl">🔴</span>
        <span className="absolute bottom-2 right-12 text-4xl">🔵</span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-white">
          SORT • FLEXIBILITY • SOLVE
        </span>
      </div>
    );
  if (componentName === "RED_LIGHT_GREEN_LIGHT")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#34d399] to-[#059669]`}
        aria-hidden
      >
        <span className="absolute bottom-4 left-3 text-4xl">🟢</span>
        <span className="absolute left-1/2 top-3 -translate-x-1/2 text-4xl">
          🚶‍♂️
        </span>
        <span className="absolute bottom-3 right-3 text-4xl">🔴</span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-white">
          INHIBITION • ATTENTION • CONTROL
        </span>
      </div>
    );
  if (componentName === "WATER_PIPELINE")
    return (
      <div
        className={`${common} bg-gradient-to-b from-[#70d8ef] to-[#59af72]`}
        aria-hidden
      >
        <span className="absolute bottom-4 left-3 text-4xl">💧</span>
        <span className="absolute left-1/2 top-3 -translate-x-1/2 text-4xl">
          🔧
        </span>
        <span className="absolute bottom-3 right-3 text-4xl">🌻</span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-white">
          TURN • CONNECT • FLOW
        </span>
      </div>
    );
  if (componentName === "PATTERN_MATRIX")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#312e81] to-[#7e22ce]`}
        aria-hidden
      >
        <img
          src="/games/pattern-matrix.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "NUMBER_BUILDER")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#f97316] to-[#e11d48]`}
        aria-hidden
      >
        <span className="absolute bottom-4 left-3 text-4xl">🍎</span>
        <span className="absolute left-1/2 top-3 -translate-x-1/2 text-4xl">
          🔢
        </span>
        <span className="absolute bottom-3 right-3 text-4xl">4️⃣</span>
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black tracking-widest text-white">
          COUNT • BUILD • MATCH
        </span>
      </div>
    );
  if (componentName === "CATCH_THE_TARGET")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#51a7c4] to-[#79ba69]`}
        aria-hidden
      >
        <img
          src="/games/catch-the-target.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "MENTAL_ROTATION")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#dff7ff] to-[#eee6ff]`}
        aria-hidden
      >
        <img
          src="/games/mental-rotation.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "WATER_JUGS")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#dffaff] to-[#dff5ef]`}
        aria-hidden
      >
        <img
          src="/games/water-jugs.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "TANGRAM_BUILDER")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#e7fbf7] to-[#dbeeff]`}
        aria-hidden
      >
        <img
          src="/games/tangram-builder.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "SOKOBAN")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#eee8ff] to-[#dff5ef]`}
        aria-hidden
      >
        <img
          src="/games/sokoban.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "COLOR_SHIFT")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#17245d] to-[#245982]`}
        aria-hidden
      >
        <img
          src="/games/color-shift.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "AIR_HOCKEY_CHALLENGE")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#102856] to-[#0e7187]`}
        aria-hidden
      >
        <img
          src="/games/air-hockey-challenge.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "MEMORY_MARKET")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#fff7cf] to-[#7fcfa8]`}
        aria-hidden
      >
        <img
          src="/games/memory-market.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "AIRPORT_CONTROLLER")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#bfe8f4] to-[#72b77a]`}
        aria-hidden
      >
        <img
          src="/games/airport-controller.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "RULE_SHIFT_CHALLENGE")
    return (
      <div
        className={`${common} bg-gradient-to-br from-[#ffe5d9] to-[#ffcad4]`}
        aria-hidden
      >
        <img
          src="/games/rule-shift-challenge.svg"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  if (componentName === "MINI_GOLF_CHALLENGE") return <div className={`${common} bg-gradient-to-br from-[#16484d] to-[#61bd72]`} aria-hidden><img src="/games/mini-golf-challenge.svg" alt="" className="h-full w-full object-cover" /></div>;
  if (componentName === "RACING_STRATEGIST") return <div className={`${common} bg-gradient-to-br from-[#dc2626] to-[#071633]`} aria-hidden><img src="/games/racing-strategist.svg" alt="" className="h-full w-full object-cover" /></div>;

  return (
    <div className={`${common} place-items-center`} aria-hidden>
      <Gamepad2 className="h-9 w-9 text-[#007f70]" />
    </div>
  );
}

function GameMeta({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#edf2f1] bg-[#f7faf9] px-3 py-2.5">
      <p className="text-[7px] font-black uppercase tracking-[.12em] text-[#96a5ad]">
        {label}
      </p>
      <p
        className={`mt-1 flex items-center gap-1 text-[10px] font-black ${accent ? "text-violet-700" : "text-[#173044]"}`}
      >
        {icon && <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>}
        {value}
      </p>
    </div>
  );
}

function gameCardTheme(componentName: string) {
  if (componentName === "COLOR_PATH")
    return "from-[#5a3cc8] via-[#8c55df] to-[#d56eb4]";
  if (componentName === "MAGIC_PAINT")
    return "from-[#ff4f64] via-[#9b5de5] to-[#3b82f6]";
  if (componentName === "BALL_STACK")
    return "from-[#096e79] via-[#12a18f] to-[#6fc486]";
  if (componentName === "FOLLOW_THE_LIGHTS")
    return "from-[#122655] via-[#324b98] to-[#6377d7]";
  if (componentName === "SOUND_DETECTIVE")
    return "from-[#9b4d21] via-[#dd7b35] to-[#f1b84b]";
  if (componentName === "TRAIN_TRACK_BUILDER")
    return "from-[#145d73] via-[#258d83] to-[#68b967]";
  if (componentName === "PACKAGE_SORTER")
    return "from-[#9f1239] via-[#e11d48] to-[#fda4af]";
  if (componentName === "MAGIC_TRAIN")
    return "from-[#3f51a3] via-[#6754c7] to-[#f06d91]";
  if (componentName === "RESCUE_MISSION")
    return "from-[#117995] via-[#23a994] to-[#79ca70]";
  if (componentName === "PARKING_ESCAPE")
    return "from-[#173f59] via-[#287a8c] to-[#57b58b]";
  if (componentName === "BALL_SORT")
    return "from-[#4b2673] via-[#7d4db3] to-[#c78df0]";
  if (componentName === "RED_LIGHT_GREEN_LIGHT")
    return "from-[#065f46] via-[#059669] to-[#34d399]";
  if (componentName === "WATER_PIPELINE")
    return "from-[#137da1] via-[#20a7b0] to-[#68bd70]";
  if (componentName === "PATTERN_MATRIX")
    return "from-[#312e81] via-[#5b21b6] to-[#9333ea]";
  if (componentName === "CATCH_THE_TARGET")
    return "from-[#257e9c] via-[#4ea8a0] to-[#79ba69]";
  if (componentName === "MENTAL_ROTATION")
    return "from-[#4772a8] via-[#7068b4] to-[#a984c8]";
  if (componentName === "WATER_JUGS")
    return "from-[#176f86] via-[#168f9a] to-[#39b69d]";
  if (componentName === "TANGRAM_BUILDER")
    return "from-[#176f86] via-[#218f89] to-[#65bca5]";
  if (componentName === "SOKOBAN")
    return "from-[#57418f] via-[#6868ad] to-[#32958e]";
  if (componentName === "COLOR_SHIFT")
    return "from-[#17245d] via-[#246686] to-[#35bda4]";
  if (componentName === "AIR_HOCKEY_CHALLENGE")
    return "from-[#102856] via-[#185b7e] to-[#0e8f91]";
  if (componentName === "MEMORY_MARKET")
    return "from-[#176f67] via-[#31a78e] to-[#8fca76]";
  if (componentName === "AIRPORT_CONTROLLER")
    return "from-[#23627d] via-[#3998aa] to-[#70b777]";
  if (componentName === "RULE_SHIFT_CHALLENGE")
    return "from-[#ff9f1c] via-[#ffbf69] to-[#ffcad4]";
  if (componentName === "MINI_GOLF_CHALLENGE") return "from-[#16484d] via-[#287a63] to-[#61bd72]";
  if (componentName === "RACING_STRATEGIST") return "from-[#dc2626] via-[#ea580c] to-[#071633]";

  return "from-[#0b6870] via-[#168e84] to-[#54baa5]";
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
