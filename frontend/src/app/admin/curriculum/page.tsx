"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen, Boxes, ChevronLeft, ChevronRight,
  Gamepad2, GraduationCap, Loader2, Pencil, Plus,
  Power, Search, Trash2, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const tabs = ["Boards", "Academic Years", "Grades", "Subjects", "Chapters", "Topics", "Learning Outcomes", "Game Library"];
const endpoints: Record<string, string> = {
  Boards: "boards", "Academic Years": "academic-years", Grades: "grades",
  Subjects: "subjects", Chapters: "chapters", Topics: "topics",
  "Learning Outcomes": "learning-outcomes",
};
const gradeNames = Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`);
const devices = ["Desktop", "Tablet", "Mobile", "Interactive Board"];

type Row = Record<string, any>;

export default function CurriculumPage() {
  const hideGameSettings = usePathname().startsWith("/admin/game-assessments");
  const [tab, setTab] = useState("Game Library");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [categories, setCategories] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [modal, setModal] = useState<"entity" | "template" | "preview" | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [error, setError] = useState("");

  const auth = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "x-tenant-id": localStorage.getItem("schoolId") || "",
  }), []);
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API}/${path}`, {
      ...options,
      headers: { ...auth(), ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Request failed.");
    return payload;
  }, [auth]);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(Object.entries(endpoints).map(async ([name, path]) => [name, await request(path)] as const));
      const categoryRows = await request("game-categories");
      setData(Object.fromEntries(entries));
      setCategories(categoryRows);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load curriculum."); }
    finally { setLoading(false); }
  }, [request]);

  const loadTemplates = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), pageSize: "9" });
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (difficulty) query.set("difficulty", difficulty);
    if (categoryId) query.set("categoryId", categoryId);
    try {
      const result = await request(`game-library?${query}`);
      setTemplates(result.items); setTotalPages(result.totalPages || 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load templates."); }
  }, [request, page, search, status, difficulty, categoryId]);

  useEffect(() => { void loadHierarchy(); }, [loadHierarchy]);
  useEffect(() => { const timer = setTimeout(() => void loadTemplates(), 250); return () => clearTimeout(timer); }, [loadTemplates]);

  const rows = data[tab] || [];
  const filteredRows = useMemo(() => rows.filter((row) =>
    !search || `${row.name || row.outcome || ""} ${row.code || row.outcomeCode || ""}`.toLowerCase().includes(search.toLowerCase())
  ).filter((row) => !status || row.status === status), [rows, search, status]);

  const openCreate = () => {
    setEditing(null); setError("");
    if (categories.length === 0) {
      void loadHierarchy();
    }
    setForm(tab === "Game Library" ? {
      name: "", categoryId: categories[0]?.id || "", description: "", difficulty: "MEDIUM",
      estimatedDuration: 15, minimumQuestions: 5, maximumQuestions: 20,
      supportedDevices: ["Desktop", "Tablet"], status: "ACTIVE",
      gradeIds: [], subjectIds: [], chapterIds: [], topicIds: [], learningOutcomeIds: [],
    } : defaults(tab, data));
    setModal(tab === "Game Library" ? "template" : "entity");
  };

  const openEdit = (row: Row) => {
    setEditing(row); setError("");
    if (tab === "Game Library") {
      setForm({ ...row,
        gradeIds: [], subjectIds: [], chapterIds: [], topicIds: [], learningOutcomeIds: [],
      });
      setModal("template");
    } else { setForm({ ...row }); setModal("entity"); }
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (tab === "Game Library" && (!form.name?.trim() || !form.categoryId)) {
        throw new Error("Enter a template name and choose a game category before saving.");
      }
      const body = normalize(tab, form);
      if (tab === "Game Library") {
        await request(editing ? `game-library/${editing.id}` : "game-library", { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
        await loadTemplates();
      } else {
        const endpoint = endpoints[tab];
        await request(editing ? `curriculum/${endpoint}/${editing.id}` : endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(body) });
        await loadHierarchy();
      }
      setModal(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save."); }
    finally { setSaving(false); }
  };

  const action = async (id: string, actionName: string) => {
    try {
      await request(`game-library/${id}/action`, { method: "POST", body: JSON.stringify({ action: actionName }) });
      await loadTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
  };

  const createClassesOneToTen = async () => {
    const year = data["Academic Years"]?.[0];
    if (!year) {
      setError("Create a Board and Academic Year first, then add Classes 1–10.");
      return;
    }
    const existing = new Set((data.Grades || []).filter((grade) => grade.academicYearId === year.id).map((grade) => grade.name));
    const missing = gradeNames.filter((name) => !existing.has(name));
    if (!missing.length) {
      setError("Classes 1–10 are already configured for this academic year.");
      return;
    }
    setBulkCreating(true);
    setError("");
    try {
      for (const [index, name] of missing.entries()) {
        await request("grades", { method: "POST", body: JSON.stringify({ boardId: year.boardId, academicYearId: year.id, name, sortOrder: Number(name.replace(/\D/g, "")) || index + 1, status: "ACTIVE" }) });
      }
      await loadHierarchy();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create Classes 1–10.");
    } finally {
      setBulkCreating(false);
    }
  };

  const remove = async (row: Row) => {
    const warning = tab === "Game Library"
      ? `Delete ${row.name}? This also removes games created from this template, their assignments, play sessions, and results. This cannot be undone.`
      : `Delete ${row.name || row.outcome}? This cannot be undone.`;
    if (!confirm(warning)) return;
    try {
      const path = tab === "Game Library" ? `game-library/${row.id}` : `curriculum/${endpoints[tab]}/${row.id}`;
      await request(path, { method: "DELETE" });
      tab === "Game Library" ? await loadTemplates() : await loadHierarchy();
    } catch (e) { setError(e instanceof Error ? e.message : "Delete failed."); }
  };

  return (
    <div>
      <div className="min-h-full space-y-5 text-[#071633]">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#071633] via-[#0b4353] to-[#008c78] p-5 shadow-lg sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h1 className="keep-white text-2xl font-black sm:text-3xl">Game templates</h1>
              <p className="keep-white mt-1.5 max-w-2xl text-xs leading-5 opacity-80">Create reusable game styles. Class and subject are selected later in Game-Based Assessments.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tab === "Grades" && <button onClick={createClassesOneToTen} disabled={bulkCreating} className="keep-white inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-xs font-extrabold hover:bg-white/25 disabled:opacity-50">{bulkCreating ? <Loader2 className="keep-white h-4 w-4 animate-spin" /> : <GraduationCap className="keep-white h-4 w-4" />} Add Classes 1–10</button>}
              <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-[#006f63] shadow-md hover:bg-[#f2fffb]"><Plus className="h-4 w-4" /> Add {tab === "Game Library" ? "game template" : tab.replace(/s$/, "")}</button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={`Search ${tab.toLowerCase()}...`} className="w-full rounded-xl border border-[#dceae6] bg-transparent py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#009b87] dark:border-slate-700" /></label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="filter"><option value="">All statuses</option><option>ACTIVE</option><option>DRAFT</option><option>DISABLED</option><option>ARCHIVED</option></select>
            {tab === "Game Library" && <>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="filter"><option value="">All difficulties</option><option>EASY</option><option>MEDIUM</option><option>HARD</option></select>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="filter"><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </>}
          </div>
          {error && <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
        </section>

        {loading ? <Skeletons /> : tab === "Game Library" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => <TemplateCard key={template.id} row={template} onPreview={() => { setEditing(template); setModal("preview"); }} onEdit={() => openEdit(template)} onAction={action} onDelete={() => remove(template)} />)}
              {!templates.length && <Empty text="No game templates match these filters." />}
            </div>
            <div className="flex items-center justify-end gap-3 text-xs font-bold"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="pager"><ChevronLeft className="h-4 w-4" /></button>Page {page} of {totalPages}<button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="pager"><ChevronRight className="h-4 w-4" /></button></div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row) => <EntityCard key={row.id} tab={tab} row={row} onEdit={() => openEdit(row)} onDelete={() => remove(row)} />)}
            {!filteredRows.length && <Empty text={`No ${tab.toLowerCase()} found. Add the first record to continue the hierarchy.`} />}
          </div>
        )}
      </div>

      {(modal === "entity" || modal === "template") && <Dialog title={`${editing ? "Edit" : "Create"} ${tab === "Game Library" ? "Game Template" : tab.replace(/s$/, "")}`} onClose={() => setModal(null)}>
        {modal === "entity" ? <EntityForm tab={tab} form={form} setForm={setForm} data={data} /> : <TemplateForm form={form} setForm={setForm} data={data} categories={categories} hideGameSettings={hideGameSettings} />}
        {error && <p role="alert" className="game-assessment-alert--error rounded-lg border p-2 text-xs font-bold">{error}</p>}
        <div className="flex justify-end gap-2 pt-2"><button onClick={() => setModal(null)} className="secondary">Cancel</button><button onClick={save} disabled={saving} className="primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</button></div>
      </Dialog>}
      {modal === "preview" && editing && <Dialog title="Template Preview" onClose={() => setModal(null)}>
        <div className="template-preview-surface overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-900 p-6">
          <Gamepad2 className="template-preview-accent h-10 w-10" /><p className="template-preview-accent mt-6 text-[10px] font-bold uppercase tracking-widest">{editing.category?.name || "Game template"}</p>
          <h3 className="mt-1 text-2xl font-black">{editing.name}</h3><p className="mt-2 text-xs leading-5 text-white/80">{editing.description || "No description supplied."}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold"><span className="template-preview-badge">{editing.difficulty}</span><span className="template-preview-badge">{editing.estimatedDuration} min</span><span className="template-preview-badge">{editing.minimumQuestions}–{editing.maximumQuestions} questions</span><span className="template-preview-badge">Version {editing.version}</span></div>
        </div>
        <p className="text-[11px] text-slate-500">This preview shows the template details that teachers will use when creating an assessment.</p>
      </Dialog>}
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur"><div className="keep-white flex items-center gap-2 text-[10px] font-bold uppercase opacity-75 [&_svg]:h-4 [&_svg]:w-4">{icon}<span>{label}</span></div><p className="keep-white mt-1 text-xl font-black">{value}</p></div>;
}
function EntityCard({ tab, row, onEdit, onDelete }: { tab: string; row: Row; onEdit: () => void; onDelete: () => void }) {
  const subtitle = tab === "Academic Years" ? `${date(row.startDate)} – ${date(row.endDate)}` : tab === "Learning Outcomes" ? `${row.outcomeCode} · ${row.bloomLevel}` : row.description || relationLabel(tab, row);
  return <article className="group rounded-2xl border border-[#dceae6] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f7f2] text-[#008c78]"><BookOpen className="h-4 w-4" /></div><Status value={row.status || (row.isCurrent ? "ACTIVE" : "INACTIVE")} /></div>
    <h3 className="mt-3 text-sm font-extrabold">{row.name || row.outcome}</h3><p className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-500">{subtitle}</p>
    <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
      <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe1dd] px-3 py-2 text-[10px] font-bold text-[#405466] hover:border-[#79bdb0] hover:bg-[#f0faf7] hover:text-[#006f63]"><Pencil className="h-3.5 w-3.5" /> Edit</button>
      <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
    </div>
  </article>;
}
function TemplateCard({ row, onPreview, onEdit, onAction, onDelete }: any) {
  const stop = (callback: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    callback();
  };
  return <article role="button" tabIndex={0} aria-label={`Preview ${row.name}`} onClick={onPreview} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPreview(); } }} className="group cursor-pointer overflow-hidden rounded-2xl border border-[#dceae6] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009b87] focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900">
    <div className="relative h-28 bg-gradient-to-br from-[#071633] via-[#123f5a] to-[#009b87] p-4 text-white">
      <Gamepad2 className="h-7 w-7 text-teal-200" /><div className="absolute right-3 top-3"><Status value={row.status} /></div><p className="keep-white absolute bottom-3 text-[10px] font-extrabold uppercase tracking-widest">{row.category?.name}</p>
    </div>
    <div className="p-4"><div className="flex justify-between gap-2"><div><p className="text-[9px] font-bold text-[#009b87]">{row.templateId} · v{row.version}</p><h3 className="mt-1 text-sm font-extrabold">{row.name}</h3></div><span className="text-[9px] font-bold text-slate-400">{row.difficulty}</span></div>
      <p className="mt-2 line-clamp-2 min-h-8 text-[10px] leading-4 text-slate-500">{row.description || "Reusable educational game template."}</p>
      <p className="mt-2 text-[9px] font-semibold text-slate-400">{row.estimatedDuration} min · {row.minimumQuestions}–{row.maximumQuestions} questions · {row._count?.versions || 1} versions</p>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={stop(onEdit)} className="template-action"><Pencil /> Edit</button>
        <button type="button" onClick={stop(() => onAction(row.id, row.status === "ACTIVE" ? "DISABLE" : "ENABLE"))} className="template-action"><Power /> {row.status === "ACTIVE" ? "Disable" : "Enable"}</button>
        <button type="button" onClick={stop(onDelete)} className="template-action template-action--danger"><Trash2 /> Delete</button>
      </div>
    </div>
  </article>;
}
function EntityForm({ tab, form, setForm, data }: any) {
  const field = (key: string, value: any) => setForm({ ...form, [key]: value });
  return <div className="grid gap-4 sm:grid-cols-2">
    {tab === "Boards" && <><Input label="Board name" value={form.name} onChange={(v: any) => field("name", v)} placeholder="CBSE" /><Input label="Code" value={form.code} onChange={(v: any) => field("code", v)} placeholder="CBSE" /><TextArea label="Description" value={form.description} onChange={(v: any) => field("description", v)} /></>}
    {tab === "Academic Years" && <><Select label="Board" value={form.boardId} onChange={(v: any) => field("boardId", v)} rows={data.Boards} /><Input label="Academic year" value={form.name} onChange={(v: any) => field("name", v)} placeholder="2026-2027" /><Input label="Start date" type="date" value={isoDate(form.startDate)} onChange={(v: any) => field("startDate", v)} /><Input label="End date" type="date" value={isoDate(form.endDate)} onChange={(v: any) => field("endDate", v)} /></>}
    {tab === "Grades" && <><Select label="Board" value={form.boardId} onChange={(v: any) => field("boardId", v)} rows={data.Boards} /><Select label="Academic year" value={form.academicYearId} onChange={(v: any) => field("academicYearId", v)} rows={data["Academic Years"]?.filter((x: Row) => !form.boardId || x.boardId === form.boardId)} /><Select label="Grade / Class" value={form.name} onChange={(v: any) => field("name", v)} rows={gradeNames.map((name, id) => ({ id: name, name }))} /><Input label="Sort order" type="number" value={form.sortOrder} onChange={(v: any) => field("sortOrder", Number(v))} /></>}
    {tab === "Subjects" && <><Select label="Grade" value={form.gradeId} onChange={(v: any) => field("gradeId", v)} rows={data.Grades} /><Input label="Subject name" value={form.name} onChange={(v: any) => field("name", v)} placeholder="Mathematics" /><Input label="Subject code" value={form.code} onChange={(v: any) => field("code", v)} placeholder="MATH" /><TextArea label="Description" value={form.description} onChange={(v: any) => field("description", v)} /></>}
    {tab === "Chapters" && <><Select label="Subject" value={form.subjectId} onChange={(v: any) => field("subjectId", v)} rows={data.Subjects} /><Input label="Chapter name" value={form.name} onChange={(v: any) => field("name", v)} /><Input label="Chapter number" type="number" value={form.chapterNumber} onChange={(v: any) => field("chapterNumber", Number(v))} /><Input label="Teaching hours" type="number" value={form.estimatedTeachingHours} onChange={(v: any) => field("estimatedTeachingHours", Number(v))} /><TextArea label="Description" value={form.description} onChange={(v: any) => field("description", v)} /><Input label="Learning objectives (comma separated)" value={(form.learningObjectives || []).join(", ")} onChange={(v: any) => field("learningObjectives", list(v))} /></>}
    {tab === "Topics" && <><Select label="Chapter" value={form.chapterId} onChange={(v: any) => field("chapterId", v)} rows={data.Chapters} /><Input label="Topic name" value={form.name} onChange={(v: any) => field("name", v)} /><EnumSelect label="Difficulty" value={form.difficulty} onChange={(v: any) => field("difficulty", v)} values={["EASY", "MEDIUM", "HARD"]} /><Input label="Duration (minutes)" type="number" value={form.estimatedDuration} onChange={(v: any) => field("estimatedDuration", Number(v))} /><TextArea label="Description" value={form.description} onChange={(v: any) => field("description", v)} /><Input label="Learning objectives (comma separated)" value={(form.learningObjectives || []).join(", ")} onChange={(v: any) => field("learningObjectives", list(v))} /></>}
    {tab === "Learning Outcomes" && <><Select label="Topic" value={form.topicId} onChange={(v: any) => field("topicId", v)} rows={data.Topics} /><Input label="Outcome code" value={form.outcomeCode} onChange={(v: any) => field("outcomeCode", v)} placeholder="MATH-G6-FR-01" /><TextArea label="Learning outcome" value={form.outcome} onChange={(v: any) => field("outcome", v)} /><EnumSelect label="Bloom's taxonomy" value={form.bloomLevel} onChange={(v: any) => field("bloomLevel", v)} values={["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"]} /><EnumSelect label="Difficulty" value={form.difficulty} onChange={(v: any) => field("difficulty", v)} values={["EASY", "MEDIUM", "HARD"]} /></>}
    <EnumSelect label="Status" value={form.status} onChange={(v: any) => field("status", v)} values={["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]} />
  </div>;
}
function TemplateForm({ form, setForm, categories, hideGameSettings = false }: any) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const field = (key: string, value: any) => setForm({ ...form, [key]: value });

  return <div className="space-y-5">
    <section>
      <h3 className="text-sm font-black text-[#071633]">{hideGameSettings ? "Game details" : "1. Game details"}</h3>
      <p className="mt-1 text-[11px] text-slate-500">Give teachers a clear name for the game style.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Input label="Template name *" value={form.name} onChange={(v: any) => field("name", v)} placeholder="Example: Fraction Treasure Hunt" />
        <Select label="Game category *" value={form.categoryId} onChange={(v: any) => field("categoryId", v)} rows={categories} />
        <TextArea label="Short description" value={form.description} onChange={(v: any) => field("description", v)} />
      </div>
    </section>

    {!hideGameSettings && <section className="border-t border-slate-200 pt-5">
      <h3 className="text-sm font-black text-[#071633]">2. Game settings</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <EnumSelect label="Difficulty" value={form.difficulty} onChange={(v: any) => field("difficulty", v)} values={["EASY", "MEDIUM", "HARD"]} />
        <Input label="Duration in minutes" type="number" value={form.estimatedDuration} onChange={(v: any) => field("estimatedDuration", Number(v))} />
        <Input label="Minimum questions" type="number" value={form.minimumQuestions} onChange={(v: any) => field("minimumQuestions", Number(v))} />
        <Input label="Maximum questions" type="number" value={form.maximumQuestions} onChange={(v: any) => field("maximumQuestions", Number(v))} />
      </div>
      <label className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
        <input type="checkbox" checked={form.status === "ACTIVE"} onChange={(e) => field("status", e.target.checked ? "ACTIVE" : "DRAFT")} className="h-4 w-4 accent-[#008c78]" />
        Make this template available in Game-Based Assessments immediately
      </label>
    </section>}

    {!hideGameSettings && <section className="border-t border-slate-200 pt-4">
      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs font-black text-[#007f70]">{showAdvanced ? "Hide optional settings" : "Show optional display settings"}</button>
      {showAdvanced && <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MultiSelect label="Supported devices" values={form.supportedDevices || []} rows={devices.map((name) => ({ id: name, name }))} onChange={(v: any) => field("supportedDevices", v)} />
        <Input label="Thumbnail URL" value={form.thumbnail} onChange={(v: any) => field("thumbnail", v)} />
        <Input label="Preview image URL" value={form.previewImage} onChange={(v: any) => field("previewImage", v)} />
        {form.id && <Input label="Version change note" value={form.changeNote} onChange={(v: any) => field("changeNote", v)} />}
      </div>}
    </section>}
  </div>;
}
function Dialog({ title, onClose, children }: any) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6" onMouseDown={(e) => e.stopPropagation()}><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-[#071633]">{title}</h2><button type="button" aria-label="Close preview" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><div className="space-y-4">{children}</div></div></div>;
}
function Input({ label, value = "", onChange, type = "text", placeholder = "" }: any) { return <label className="field">{label}<input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="form-input" /></label>; }
function TextArea({ label, value = "", onChange }: any) { return <label className="field sm:col-span-2">{label}<textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} className="form-input resize-none" /></label>; }
function Select({ label, value = "", onChange, rows = [], nameKey = "name" }: any) { return <label className="field">{label}<select value={value || ""} onChange={(e) => onChange(e.target.value)} className="form-input"><option value="">Select…</option>{rows.map((row: Row) => <option key={row.id} value={row.id}>{row[nameKey]}</option>)}</select></label>; }
function EnumSelect({ label, value = "", onChange, values }: any) { return <Select label={label} value={value} onChange={onChange} rows={values.map((name: string) => ({ id: name, name }))} />; }
function MultiSelect({ label, values, rows, onChange, nameKey = "name" }: any) { return <label className="field">{label}<select multiple value={values} onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))} className="form-input min-h-24">{rows.map((row: Row) => <option key={row.id} value={row.id}>{row[nameKey]}</option>)}</select><span className="text-[9px] font-normal text-slate-400">Use Ctrl/Cmd to select multiple</span></label>; }
function Status({ value }: { value: string }) { const active = value === "ACTIVE"; return <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${active ? "bg-emerald-100 text-emerald-700" : value === "ARCHIVED" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{value}</span>; }
function Empty({ text }: { text: string }) { return <div className="col-span-full rounded-2xl border border-dashed border-[#b9d8d1] bg-white p-10 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900"><Boxes className="mx-auto mb-3 h-8 w-8 text-[#73b7aa]" />{text}</div>; }
function Skeletons() { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>; }
function defaults(tab: string, data: Record<string, Row[]>) { const common = { status: "ACTIVE" }; if (tab === "Boards") return { ...common, name: "", code: "", description: "" }; if (tab === "Academic Years") return { ...common, boardId: data.Boards?.[0]?.id || "", name: "", startDate: "", endDate: "", isCurrent: true }; if (tab === "Grades") return { ...common, boardId: data.Boards?.[0]?.id || "", academicYearId: data["Academic Years"]?.[0]?.id || "", name: "Grade 1", sortOrder: 1 }; if (tab === "Subjects") return { ...common, gradeId: data.Grades?.[0]?.id || "", name: "", isCustom: true }; if (tab === "Chapters") return { ...common, subjectId: data.Subjects?.[0]?.id || "", name: "", chapterNumber: 1, estimatedTeachingHours: 1, learningObjectives: [] }; if (tab === "Topics") return { ...common, chapterId: data.Chapters?.[0]?.id || "", name: "", difficulty: "MEDIUM", estimatedDuration: 30, learningObjectives: [] }; return { ...common, topicId: data.Topics?.[0]?.id || "", outcome: "", outcomeCode: "", bloomLevel: "UNDERSTAND", difficulty: "MEDIUM" }; }
function normalize(tab: string, form: Row) {
  if (tab === "Game Library") {
    const allowed = [
      "templateId", "name", "description", "categoryId", "difficulty",
      "estimatedDuration", "minimumQuestions", "maximumQuestions",
      "supportedDevices", "thumbnail", "previewImage", "status",
      "gradeIds", "subjectIds", "chapterIds", "topicIds",
      "learningOutcomeIds", "changeNote",
    ];
    return Object.fromEntries(allowed.filter((key) => form[key] !== undefined).map((key) => [key, form[key]]));
  }
  const body = { ...form };
  ["id", "schoolId", "createdAt", "updatedAt", "board", "academicYear", "grade", "subject", "chapter", "topic", "category", "mappings", "versions", "_count"].forEach((k) => delete body[k]);
  if (tab === "Boards" && body.code) body.code = body.code.toUpperCase();
  return body;
}
function list(value: string) { return value.split(",").map((x) => x.trim()).filter(Boolean); }
function mapped(row: Row, key: string) { return (row.mappings || []).flatMap((m: Row) => m[key] ? [m[key]] : []); }
function isoDate(value?: string) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function relationLabel(tab: string, row: Row) { if (tab === "Grades") return `${row.board?.name || "Board"} · ${row.academicYear?.name || "Academic year"}`; if (tab === "Subjects") return row.grade?.name || "Grade"; if (tab === "Chapters") return `Chapter ${row.chapterNumber} · ${row.estimatedTeachingHours || 0} teaching hours`; if (tab === "Topics") return `${row.difficulty} · ${row.estimatedDuration || 0} minutes`; return ""; }
