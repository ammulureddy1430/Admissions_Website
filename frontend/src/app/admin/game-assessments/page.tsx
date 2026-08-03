"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Gamepad2,
  Loader2,
  Save,
  CheckCircle2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import GameTemplatesPage from "../curriculum/page";
import TextbooksPage from "../textbooks/page";

type WorkspaceTab = "assessments" | "templates" | "textbooks";

const defaultSettings = {
  randomQuestions: true,
  shuffleOptions: true,
  shuffleGames: false,
  timer: true,
  negativeMarks: false,
  resume: true,
  fullscreen: true,
  sound: true,
  music: false,
  hints: true,
  leaderboard: false,
  rewards: false,
  certificates: false,
};

export default function GameAssessmentsPage() {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("textbooks");
  const [token, setToken] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<Record<string, any[]>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [generatedAssessmentId, setGeneratedAssessmentId] = useState("");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["MCQ"]);
  const [deletingDraft, setDeletingDraft] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionEdit, setQuestionEdit] = useState<any>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState("");
  const [showOptionalFilters, setShowOptionalFilters] = useState(false);
  const [showAssessmentSettings, setShowAssessmentSettings] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    assessmentType: "Practice",
    assessmentMode: "HOME",
    subject: "Mathematics",
    grade: "Grade 1",
    section: "",
    chapter: "",
    topics: "",
    teacherName: "",
    academicYear: "2026-2027",
    difficulty: "EASY",
    language: "English",
    learningOutcome: "",
    boardId: "",
    academicYearId: "",
    gradeId: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    learningOutcomeId: "",
    textbookId: "",
    textbookVersionId: "",
    numberOfQuestions: 10,
    numberOfGames: 1,
    timeLimit: 30,
    passingMarks: 50,
    attemptLimit: 1,
    dueDate: "",
  });
  const settings = defaultSettings;

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "assessments" || requestedTab === "templates" || requestedTab === "textbooks") setWorkspaceTab(requestedTab);
    const storedToken = localStorage.getItem("token") || "";
    const storedSchool = localStorage.getItem("schoolId") || "";
    setToken(storedToken);
    setSchoolId(storedSchool);
    if (storedToken && storedSchool) {
      void loadAssessments(storedToken, storedSchool);
      void loadCurriculum(storedToken, storedSchool);
    }
  }, []);

  useEffect(() => {
    if (workspaceTab === "assessments" && token && schoolId) {
      void loadCurriculum(token, schoolId);
    }
  }, [workspaceTab, token, schoolId]);

  const apiHeaders = (authToken = token, tenant = schoolId) => ({ Authorization: `Bearer ${authToken}`, "x-tenant-id": tenant });

  const loadCurriculum = async (authToken = token, tenant = schoolId) => {
    setCurriculumLoading(true);
    setCurriculumError("");
    try {
      const paths = ["boards", "academic-years", "grades", "subjects", "chapters", "topics", "learning-outcomes", "game-library?pageSize=100&status=ACTIVE", "textbooks?pageSize=100&status=ACTIVE"];
      const responses = await Promise.all(paths.map((path) => fetch(`http://localhost:5001/${path}`, { headers: apiHeaders(authToken, tenant) })));
      if (responses.some((response) => response.status === 401)) throw new Error("Your session has expired. Please sign in again.");
      if (responses.some((response) => !response.ok)) throw new Error("Curriculum data could not be loaded.");
      const payloads = await Promise.all(responses.map((response) => response.json()));
      setCurriculum({ boards: payloads[0], years: payloads[1], grades: payloads[2], subjects: payloads[3], chapters: payloads[4], topics: payloads[5], outcomes: payloads[6], textbooks: payloads[8].items || [] });
      setTemplates(payloads[7].items || []);
    } catch (error) {
      setCurriculumError(error instanceof Error ? error.message : "Curriculum data could not be loaded.");
    } finally {
      setCurriculumLoading(false);
    }
  };

  const loadAssessments = async (authToken = token, tenant = schoolId) => {
    const response = await fetch("http://localhost:5001/game-assessments", {
      headers: { Authorization: `Bearer ${authToken}`, "x-tenant-id": tenant },
    });
    if (response.ok) setSaved(await response.json());
  };

  const saveDraft = async (quiet = false) => {
    setFormError("");
    setSuccess("");
    const missing = [
      [form.name.trim(), "assessment name"],
      [form.boardId, "board"],
      [form.academicYearId, "academic year"],
      [form.gradeId, "grade"],
      [form.subjectId, "subject"],
      [form.textbookId, "textbook"],
    ].filter(([value]) => !value).map(([, label]) => label);
    if (missing.length) {
      setFormError(`Please select: ${missing.join(", ")}.`);
      return null;
    }
    if (form.numberOfQuestions < 1 || form.numberOfQuestions > 50) {
      setFormError("Questions must be between 1 and 50.");
      return null;
    }
    if (form.passingMarks < 0 || form.passingMarks > 100) {
      setFormError("Passing marks must be between 0 and 100.");
      return null;
    }
    if (!token || !schoolId) {
      setFormError("Your session has expired. Please sign in again.");
      return null;
    }
    setSaving(true);
    try {
      const response = await fetch("http://localhost:5001/game-assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-tenant-id": schoolId,
        },
        body: JSON.stringify({
          ...form,
          topics: form.topics.split(",").map((topic) => topic.trim()).filter(Boolean),
          dueDate: form.dueDate || undefined,
          settings,
          templateIds: selectedTemplates,
          status: "DRAFT",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message);
      if (!quiet) setSuccess("Assessment draft saved.");
      await loadAssessments();
      return payload;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the draft.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:5001/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-tenant-id": schoolId,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message || "Request failed.");
    return payload;
  };

  const deleteDraft = async (assessment: any) => {
    if (!window.confirm(`Delete draft "${assessment.name}"? This cannot be undone.`)) return;
    setDeletingDraft(assessment.id);
    setFormError("");
    try {
      await request(`game-assessments/${assessment.id}`, { method: "DELETE" });
      setSaved((current) => current.filter((item) => item.id !== assessment.id));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete the draft.");
    } finally {
      setDeletingDraft("");
    }
  };

  const clearAllDrafts = async () => {
    const drafts = saved.filter((assessment) => assessment.status === "DRAFT");
    if (!drafts.length || !window.confirm(`Delete all ${drafts.length} saved drafts? This cannot be undone.`)) return;
    setDeletingDraft("__all__");
    setFormError("");
    try {
      for (const assessment of drafts) {
        await request(`game-assessments/${assessment.id}`, { method: "DELETE" });
      }
      setSaved((current) => current.filter((assessment) => assessment.status !== "DRAFT"));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to clear all drafts.");
      await loadAssessments();
    } finally {
      setDeletingDraft("");
    }
  };

  const startQuestionEdit = (question: any) => {
    setEditingQuestionId(question.id);
    setQuestionEdit({
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      options: (question.options || []).map((option: any) => ({
        optionKey: option.optionKey,
        optionText: option.optionText,
        isCorrect: !!option.isCorrect,
      })),
    });
  };

  const saveQuestionEdit = async (question: any) => {
    if (!questionEdit?.questionText?.trim()) {
      setFormError("Question text cannot be empty.");
      return;
    }
    const correctOption = questionEdit.options?.find((option: any) => option.isCorrect);
    const correctAnswer = questionEdit.options?.length ? correctOption?.optionText?.trim() : questionEdit.correctAnswer?.trim();
    if (!correctAnswer) {
      setFormError("Choose or enter the correct answer.");
      return;
    }
    setSavingQuestion(true);
    setFormError("");
    try {
      const updated = await request(`game-assessments/questions/${question.id}`, {
        method: "PUT",
        body: JSON.stringify({
          questionText: questionEdit.questionText.trim(),
          correctAnswer,
          explanation: questionEdit.explanation.trim(),
          options: questionEdit.options,
        }),
      });
      setGeneratedQuestions((current) => current.map((item) => item.id === question.id ? { ...item, ...updated } : item));
      setEditingQuestionId("");
      setQuestionEdit(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const deleteGeneratedQuestion = async (question: any) => {
    if (!window.confirm("Delete this AI-generated question? This cannot be undone.")) return;
    setDeletingQuestionId(question.id);
    setFormError("");
    try {
      await request(`game-assessments/questions/${question.id}`, { method: "DELETE" });
      setGeneratedQuestions((current) => current.filter((item) => item.id !== question.id));
      if (editingQuestionId === question.id) {
        setEditingQuestionId("");
        setQuestionEdit(null);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to delete the question.");
    } finally {
      setDeletingQuestionId("");
    }
  };

  const generateAIQuestions = async () => {
    setFormError("");
    setSuccess("");
    if (selectedTemplates.length !== 1) {
      setFormError(selectedTemplates.length ? "Choose only one game template." : "Choose a game template before creating the game.");
      return;
    }
    if (!questionTypes.length) {
      setFormError("Choose at least one question type.");
      return;
    }
    setCreating(true);
    try {
      const assessment = await saveDraft(true);
      if (!assessment) return;

      const processedList = await request(`game-assessments/documents?pageSize=1&textbookVersionId=${encodeURIComponent(form.textbookVersionId)}`);
      let document = processedList.items?.find((item: any) => item.status === "READY");
      if (!document) {
        document = await request("game-assessments/documents/process", {
          method: "POST",
          body: JSON.stringify({ textbookVersionId: form.textbookVersionId }),
        });
      }

      const generated = await request("game-assessments/questions/generate", {
        method: "POST",
        body: JSON.stringify({
          processedTextbookId: document.id,
          gameAssessmentId: assessment.id,
          difficulty: form.difficulty,
          questionCount: form.numberOfQuestions,
          questionTypes,
          learningOutcome: form.learningOutcome || undefined,
          excludeQuestionTexts: generatedQuestions.map((question) => question.questionText),
        }),
      });
      const questions: any[] = generated.questions || [];
      if (!questions.length) throw new Error("No questions could be generated from this textbook.");
      const unexpectedTypes = [...new Set(questions.map((question) => question.questionType).filter((type) => !questionTypes.includes(type)))];
      if (unexpectedTypes.length) {
        throw new Error(`Question generation returned an unselected format: ${unexpectedTypes.join(", ")}. Please generate again.`);
      }
      setGeneratedQuestions(questions);
      setGeneratedAssessmentId(assessment.id);
      setSuccess(`${questions.length} questions generated. Review them below before creating the game.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to generate questions.");
    } finally {
      setCreating(false);
    }
  };

  const createPlayableGame = async () => {
    setFormError("");
    setSuccess("");
    if (!generatedQuestions.length || !generatedAssessmentId) {
      setFormError("Generate and review the AI questions before creating the game.");
      return;
    }
    setCreating(true);
    try {
      const questionIds = generatedQuestions.map((question) => question.id);
      await request("game-assessments/questions/approve", {
        method: "POST",
        body: JSON.stringify({ questionIds }),
      });
      const templateId = selectedTemplates[0];
      for (const question of generatedQuestions) {
        await request("game-assessments/game-mapping", {
          method: "POST",
          body: JSON.stringify({
            questionId: question.id,
            selectedTemplateId: templateId,
            acceptedRecommendation: false,
            recommendationKey: "Selected during assessment setup",
            difficulty: question.difficulty,
            timerSeconds: 30,
            lives: 3,
            scoringRules: { correct: 10, incorrect: 0 },
            hintRules: { enabled: true, penalty: 2 },
            animationConfiguration: { enabled: true },
            soundConfiguration: { enabled: true },
            accessibilitySettings: { reducedMotion: false, keyboard: true },
          }),
        });
      }
      const game = await request("game-assessments/generated-games/generate", {
        method: "POST",
        body: JSON.stringify({
          title: `${form.name} Game`,
          gameAssessmentId: generatedAssessmentId,
          templateId,
          questionIds,
          configuration: {
            timerSeconds: Math.max(15, Math.round((form.timeLimit * 60) / form.numberOfQuestions)),
            lives: 3,
            hints: 0,
            grade: form.grade,
            difficulty: form.difficulty,
          },
        }),
      });
      await request(`game-assessments/generated-games/${game.id}/publish`, {
        method: "POST",
        body: "{}",
      });
      window.location.href = `/admin/game-assessments/games?step=assign&gameId=${encodeURIComponent(game.id)}&assessmentId=${encodeURIComponent(generatedAssessmentId)}`;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to create the game.");
    } finally {
      setCreating(false);
    }
  };

  if (workspaceTab === "templates") {
    return (
      <div className="space-y-5">
        <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />
        <GameTemplatesPage />
      </div>
    );
  }

  if (workspaceTab === "textbooks") {
    return (
      <div className="space-y-5">
        <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />
        <TextbooksPage />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} />
      <div className="rounded-2xl bg-gradient-to-r from-[#071633] to-[#007f70] p-5 shadow-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="keep-white text-xl font-black sm:text-2xl">Game-Based Assessments</h1>
            <p className="keep-white mt-1 text-xs opacity-80">Create an assessment or open your playable games.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/game-assessments/games" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#007f70] shadow-sm hover:bg-[#f4fffc]"><Gamepad2 className="h-4 w-4" /> Play games</Link><button onClick={() => void saveDraft()} disabled={saving || creating} className="keep-white inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/20 px-3.5 py-2.5 text-xs font-bold hover:bg-white/30 disabled:opacity-50">
            {saving ? <Loader2 className="keep-white h-4 w-4 animate-spin" /> : <Save className="keep-white h-4 w-4" />} Save draft
          </button></div>
        </div>
      </div>

      {formError && <div className="game-assessment-alert game-assessment-alert--error flex items-center justify-between rounded-xl border p-3 text-xs font-semibold"><span>{formError}</span>{formError.includes("sign in") && <Link href="/login" className="font-black underline">Sign in</Link>}</div>}
      {success && <div className="game-assessment-alert game-assessment-alert--success flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold"><CheckCircle2 className="h-4 w-4" /> {success}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dceae6] bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-extrabold text-[#071633]">Step 1 — Select content</h2>
            <p className="mb-4 text-[10px] text-[#71818d]">Name the assessment, select the class, and choose the source textbook.</p>
            {curriculumError && <div className="game-assessment-alert game-assessment-alert--error mb-4 flex items-center justify-between rounded-xl border p-3 text-xs font-semibold"><span>{curriculumError}</span>{curriculumError.includes("sign in") ? <Link href="/login" className="font-black underline">Sign in</Link> : <button onClick={() => void loadCurriculum()} className="font-black underline">Retry</button>}</div>}
            {!curriculumLoading && !curriculumError && (curriculum.boards || []).length === 0 && <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><div><p className="text-xs font-black text-amber-900">Curriculum setup required</p><p className="mt-1 text-[11px] text-amber-700">Add a board, academic year, grade, and subject before creating an assessment.</p></div><Link href="/admin/curriculum" className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-black text-amber-800 shadow-sm">Set up curriculum</Link></div>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Assessment name" hint="Example: Grade 6 Fractions Challenge" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grade 6 Fractions Challenge" className="input" /></Field>
              <Field label="Board" hint="Your school curriculum board" required><select value={form.boardId} disabled={curriculumLoading || !(curriculum.boards || []).length} onChange={(e) => setForm({ ...form, boardId: e.target.value, academicYearId: "", gradeId: "", subjectId: "", chapterId: "", topicId: "", learningOutcomeId: "" })} className="input"><option value="">{curriculumLoading ? "Loading boards…" : (curriculum.boards || []).length ? "Select board" : "No boards configured"}</option>{(curriculum.boards || []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
              <Field label="Academic year" hint="Example: 2026–2027" required><select value={form.academicYearId} disabled={!form.boardId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value, academicYear: curriculum.years?.find((x) => x.id === e.target.value)?.name || "", gradeId: "", subjectId: "", chapterId: "", topicId: "", learningOutcomeId: "" })} className="input"><option value="">{form.boardId ? "Select year" : "Select board first"}</option>{(curriculum.years || []).filter((x) => form.boardId && (!x.boardId || x.boardId === form.boardId)).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
              <Field label="Grade" hint="Students who will receive the game" required><select value={form.gradeId} disabled={!form.boardId || !form.academicYearId} onChange={(e) => setForm({ ...form, gradeId: e.target.value, grade: curriculum.grades?.find((x) => x.id === e.target.value)?.name || "", subjectId: "", chapterId: "", topicId: "", learningOutcomeId: "" })} className="input"><option value="">{!form.boardId ? "Select board first" : !form.academicYearId ? "Select academic year first" : "Select grade"}</option>{(curriculum.grades || []).filter((x) => x.boardId === form.boardId && x.academicYearId === form.academicYearId && !["Grade 11", "Grade 12"].includes(x.name)).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
              <Field label="Subject" hint="Example: Mathematics" required><select value={form.subjectId} disabled={!form.gradeId} onChange={(e) => setForm({ ...form, subjectId: e.target.value, subject: curriculum.subjects?.find((x) => x.id === e.target.value)?.name || "", chapterId: "", topicId: "", learningOutcomeId: "" })} className="input"><option value="">{form.gradeId ? "Select subject" : "Select grade first"}</option>{(curriculum.subjects || []).filter((x) => x.gradeId === form.gradeId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
              <Field label="Textbook" hint="The active edition is selected automatically" required><select value={form.textbookId} onChange={(e) => { const book = curriculum.textbooks?.find((x) => x.id === e.target.value); setForm({ ...form, textbookId: e.target.value, textbookVersionId: book?.activeVersionId || book?.versions?.find((version: { isActive?: boolean }) => version.isActive)?.id || book?.versions?.[0]?.id || "" }); }} className="input"><option value="">Select textbook</option>{(curriculum.textbooks || []).filter((x) => (!form.boardId || x.boardId === form.boardId) && (!form.academicYearId || x.academicYearId === form.academicYearId) && (!form.gradeId || x.gradeId === form.gradeId) && (!form.subjectId || x.subjectId === form.subjectId)).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></Field>
              {showOptionalFilters && <Field label="Chapter" hint="Optional"><select value={form.chapterId} onChange={(e) => setForm({ ...form, chapterId: e.target.value, chapter: curriculum.chapters?.find((x) => x.id === e.target.value)?.name || "", topicId: "", learningOutcomeId: "" })} className="input"><option value="">All chapters</option>{(curriculum.chapters || []).filter((x) => !form.subjectId || x.subjectId === form.subjectId).map((row) => <option key={row.id} value={row.id}>{row.chapterNumber}. {row.name}</option>)}</select></Field>}
              {showOptionalFilters && <Field label="Topic" hint="Optional"><select value={form.topicId} onChange={(e) => { const topic = curriculum.topics?.find((x) => x.id === e.target.value); setForm({ ...form, topicId: e.target.value, topics: topic?.name || "", learningOutcomeId: "" }); }} className="input"><option value="">All topics</option>{(curriculum.topics || []).filter((x) => !form.chapterId || x.chapterId === form.chapterId).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowOptionalFilters(!showOptionalFilters)} className="text-[10px] font-black text-[#007f70] underline">{showOptionalFilters ? "Hide chapter and topic" : "Choose a chapter or topic (optional)"}</button>
              <button type="button" onClick={() => setShowAssessmentSettings(!showAssessmentSettings)} className="text-[10px] font-black text-[#007f70] underline">{showAssessmentSettings ? "Hide game settings" : "Show game settings"}</button>
            </div>
            {showAssessmentSettings && (
              <div className="mt-4 rounded-2xl border border-[#dceae6] bg-[#f8fcfa] p-4">
                <div className="mb-4"><h3 className="text-xs font-extrabold text-[#071633]">Game settings</h3><p className="mt-1 text-[10px] text-[#71818d]">Configure how students will play this assessment. Recommended defaults are already selected.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Assessment delivery" hint="Choose where students are allowed to play">
                    <select value={form.assessmentMode} onChange={(e) => setForm({ ...form, assessmentMode: e.target.value })} className="input">
                      <option value="HOME">Home assessment</option>
                      <option value="SCHOOL">At-school assessment</option>
                    </select>
                  </Field>
                  <Field label="Difficulty" hint="Medium suits most classes"><select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="input"><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></Field>
                  <Field label="Questions" hint="Recommended: 10–20"><input type="number" min={1} max={50} value={form.numberOfQuestions} onChange={(e) => setForm({ ...form, numberOfQuestions: Number(e.target.value) })} className="input" /></Field>
                  <Field label="Time limit (minutes)" hint="Recommended: 15–30"><input type="number" min={1} max={180} value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: Number(e.target.value) })} className="input" /></Field>
                  <Field label="Passing marks" hint="Percentage required to pass"><input type="number" min={0} max={100} value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: Number(e.target.value) })} className="input" /></Field>
                  <Field label="Attempts" hint="Number of allowed plays"><input type="number" min={1} max={10} value={form.attemptLimit} onChange={(e) => setForm({ ...form, attemptLimit: Number(e.target.value) })} className="input" /></Field>
                </div>
              </div>
            )}
            <div className="mt-5 rounded-2xl border border-[#cfe6e0] bg-[#f5faf8] p-4">
              <p className="text-xs font-extrabold text-[#071633]">Step 3 — Generate with AI and assign</p>
              <p className="mt-1 text-[10px] text-[#71818d]">AI generates questions only from the selected grade, subject, textbook, and optional chapter or topic, then prepares the game for assignment.</p>
              <fieldset className="mt-4">
                <legend className="text-[10px] font-extrabold text-[#344054]">Question types <span className="text-rose-500">*</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["MCQ", "Multiple choice"],
                    ["TRUE_FALSE", "True / False"],
                  ].map(([value, label]) => {
                    const selected = questionTypes.includes(value);
                    return (
                      <label key={value} className={`cursor-pointer rounded-lg border px-3 py-2 text-[10px] font-bold transition ${selected ? "border-[#008c78] bg-[#e6f7f2] text-[#006f63]" : "border-[#dceae6] bg-white text-[#607080]"}`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setQuestionTypes((current) => selected ? current.filter((type) => type !== value) : [...current, value]);
                            setGeneratedQuestions([]);
                            setGeneratedAssessmentId("");
                          }}
                          className="mr-2 accent-[#007f70]"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[9px] text-[#71818d]">Choose Multiple choice, True / False, or both. Multiple choice is selected by default.</p>
              </fieldset>
            </div>
            {formError && (
              <div id="game-generation-error" role="alert" className="game-assessment-alert game-assessment-alert--error mt-4 rounded-xl border p-3 text-xs font-semibold">
                {formError}
              </div>
            )}
            <button type="button" onClick={() => void generateAIQuestions()} disabled={saving || creating} className="keep-white mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-3 text-xs font-black hover:bg-[#006b5e] disabled:opacity-50">
              {creating ? <Loader2 className="keep-white h-4 w-4 animate-spin" /> : <Sparkles className="keep-white h-4 w-4" />} {creating ? "Generating questions with AI…" : generatedQuestions.length ? "Regenerate questions with AI" : "Generate with AI"}
            </button>
            {generatedQuestions.length > 0 && (
              <section className="mt-5 space-y-3 border-t border-[#dceae6] pt-5">
                <div>
                  <h3 className="text-sm font-extrabold text-[#071633]">AI-generated questions</h3>
                  <p className="mt-1 text-[10px] text-[#71818d]">Review the exact questions and answers before creating the game.</p>
                </div>
                {generatedQuestions.map((question, index) => (
                  <article key={question.id} className="rounded-xl border border-[#dceae6] bg-[#fafdfc] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="shrink-0 rounded-full bg-[#e6f7f2] px-2 py-1 text-[9px] font-extrabold text-[#007f70]">Question {index + 1} · {question.questionType}</span>
                      <div className="flex items-center gap-2">
                        {editingQuestionId !== question.id && <button type="button" onClick={() => startQuestionEdit(question)} className="inline-flex items-center gap-1 rounded-lg border border-[#cfe1dd] bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-[#006f63] hover:bg-[#edf9f5]"><Pencil className="h-3 w-3" /> Edit</button>}
                        <button type="button" onClick={() => void deleteGeneratedQuestion(question)} disabled={!!deletingQuestionId || savingQuestion} className="question-delete-button inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-extrabold disabled:opacity-50">{deletingQuestionId === question.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete</button>
                      </div>
                    </div>
                    {editingQuestionId === question.id && questionEdit ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-[#b9ddd5] bg-white p-3">
                        <label className="block text-[9px] font-extrabold text-[#344054]">Question
                          <textarea rows={2} value={questionEdit.questionText} onChange={(event) => setQuestionEdit({ ...questionEdit, questionText: event.target.value })} className="input mt-1 resize-none text-xs" />
                        </label>
                        {questionEdit.options?.length > 0 ? (
                          <fieldset>
                            <legend className="text-[9px] font-extrabold text-[#344054]">Answer choices — select the correct one</legend>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {questionEdit.options.map((option: any, optionIndex: number) => (
                                <label key={option.optionKey} className="flex items-center gap-2 rounded-lg border border-[#dceae6] p-2">
                                  <input type="radio" name={`correct-${question.id}`} checked={option.isCorrect} onChange={() => setQuestionEdit({ ...questionEdit, options: questionEdit.options.map((item: any, index: number) => ({ ...item, isCorrect: index === optionIndex })) })} className="accent-[#007f70]" />
                                  <span className="text-[10px] font-black text-[#344054]">{option.optionKey}.</span>
                                  <input value={option.optionText} onChange={(event) => setQuestionEdit({ ...questionEdit, options: questionEdit.options.map((item: any, index: number) => index === optionIndex ? { ...item, optionText: event.target.value } : item) })} className="min-w-0 flex-1 bg-transparent text-[10px] text-[#071633] outline-none" />
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        ) : <label className="block text-[9px] font-extrabold text-[#344054]">Correct answer<input value={questionEdit.correctAnswer} onChange={(event) => setQuestionEdit({ ...questionEdit, correctAnswer: event.target.value })} className="input mt-1 text-xs" /></label>}
                        <label className="block text-[9px] font-extrabold text-[#344054]">Simple explanation<textarea rows={2} value={questionEdit.explanation} onChange={(event) => setQuestionEdit({ ...questionEdit, explanation: event.target.value })} className="input mt-1 resize-none text-xs" /></label>
                        <div className="flex justify-end gap-2">
                          <button type="button" disabled={savingQuestion} onClick={() => { setEditingQuestionId(""); setQuestionEdit(null); }} className="rounded-lg border border-[#dceae6] px-3 py-2 text-[9px] font-extrabold text-[#526474]">Cancel</button>
                          <button type="button" disabled={savingQuestion} onClick={() => void saveQuestionEdit(question)} className="inline-flex items-center gap-1 rounded-lg bg-[#007f70] px-3 py-2 text-[9px] font-extrabold text-white disabled:opacity-50">{savingQuestion ? <Loader2 className="keep-white h-3 w-3 animate-spin" /> : <Save className="keep-white h-3 w-3" />} Save question</button>
                        </div>
                      </div>
                    ) : <>
                      <p className="mt-3 text-xs font-extrabold leading-5 text-[#071633]">{question.questionText}</p>
                      {question.options?.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option: any) => (
                            <div key={option.id || option.optionKey} className={`rounded-lg border px-3 py-2 text-[10px] ${option.isCorrect ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800" : "border-[#dceae6] bg-white text-[#607080]"}`}>
                              <span className="mr-1 font-black">{option.optionKey}.</span> {option.optionText}
                              {option.isCorrect && <span className="ml-2 text-[8px] uppercase">Correct</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 text-[10px] leading-5 text-[#607080]">
                        <p><b className="text-[#071633]">Correct answer:</b> {question.correctAnswer}</p>
                        <p><b className="text-[#071633]">Grade & subject:</b> {form.grade} · {form.subject}</p>
                        <p><b className="text-[#071633]">Textbook page:</b> {question.pageNumber || "—"}</p>
                        <p><b className="text-[#071633]">Explanation:</b> {question.explanation || "No explanation provided."}</p>
                      </div>
                    </>}
                  </article>
                ))}
                <button onClick={() => void createPlayableGame()} disabled={creating} className="keep-white inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-3 text-xs font-black hover:bg-[#006b5e] disabled:opacity-50">
                  {creating ? <Loader2 className="keep-white h-4 w-4 animate-spin" /> : <Gamepad2 className="keep-white h-4 w-4" />} {creating ? "Creating game…" : "Questions reviewed — create game & assign"}
                </button>
              </section>
            )}
          </section>

        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dceae6] bg-white p-5">
            <div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold text-[#071633]">Step 2 — Choose one game <span className="text-rose-500">*</span></h2><p className="mt-1 text-[10px] text-[#71818d]">Click a game card to select it.</p></div><span className="rounded-full bg-[#e6f7f2] px-2 py-1 text-[9px] font-bold text-[#007f70]">{selectedTemplates.length ? "Selected" : "Not selected"}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {templates.filter((template) => {
                return template.status === "ACTIVE";
              }).map((template) => {
                const selected = selectedTemplates.includes(template.id);
                return <div key={template.id} role="radio" aria-checked={selected} tabIndex={0} onClick={() => setSelectedTemplates([template.id])} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedTemplates([template.id]); }} className={`cursor-pointer rounded-xl border p-3 transition ${selected ? "border-2 border-[#009b87] bg-[#edfaf6] shadow-sm" : "border-[#dceae6] bg-[#fafdfc] hover:border-[#79bdb0]"}`}>
                  <div className="flex items-start justify-between"><Gamepad2 className="h-5 w-5 text-[#009b87]" /><input type="radio" name="game-template" checked={selected} onChange={() => setSelectedTemplates([template.id])} className="accent-[#007f70]" /></div>
                  <p className="mt-2 text-xs font-bold text-[#071633]">{template.name}</p><p className="mt-1 text-[9px] text-[#71818d]">{template.category?.name} · {template.difficulty} · {template.estimatedDuration} min</p>
                </div>;
              })}
              {templates.filter((template) => template.status === "ACTIVE").length === 0 && <p className="col-span-full rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800">No active games are available. Open <button type="button" onClick={() => setWorkspaceTab("templates")} className="font-black underline">Game Templates</button> and activate at least one.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dceae6] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-[#071633]">Saved drafts</h2>
              {saved.some((assessment) => assessment.status === "DRAFT") && <button type="button" onClick={() => void clearAllDrafts()} disabled={deletingDraft === "__all__"} aria-label="Delete all saved drafts" title="Delete all saved drafts" className="draft-delete-button grid h-8 w-8 place-items-center rounded-full transition disabled:opacity-50">{deletingDraft === "__all__" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}</button>}
            </div>
            <div className="mt-3 space-y-2">
              {saved.length === 0 ? <p className="text-[11px] text-[#71818d]">No game assessment drafts yet.</p> : saved.map((assessment) => (
                <div key={assessment.id} className="rounded-xl border border-[#e1ece9] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#071633]">{assessment.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{assessment.status}</span>
                      {assessment.status === "DRAFT" && <button type="button" onClick={() => void deleteDraft(assessment)} disabled={!!deletingDraft} aria-label={`Delete ${assessment.name} draft`} title="Delete draft" className="draft-delete-button grid h-7 w-7 place-items-center rounded-full transition disabled:opacity-50">{deletingDraft === assessment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}</button>}
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-[#71818d]">{assessment.grade} · {assessment.subject} · {assessment.numberOfQuestions} questions</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function WorkspaceTabs({ active, onChange }: { active: WorkspaceTab; onChange: (tab: WorkspaceTab) => void }) {
  const steps: Array<{ id: WorkspaceTab; number: string; title: string; copy: string }> = [
    { id: "textbooks", number: "1", title: "Textbooks", copy: "Upload the question source" },
    { id: "templates", number: "2", title: "Game Templates", copy: "Choose the game style" },
    { id: "assessments", number: "3", title: "Create Assessment", copy: "Generate and assign" },
  ];
  return (
    <section className="rounded-2xl border border-[#cfe6e0] bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h1 className="text-base font-black text-[#071633]">Create a game assessment</h1>
        <p className="mt-1 text-[11px] text-[#607080]">Follow these steps in order. Textbooks and templates can be reused for future assessments.</p>
      </div>
      <nav aria-label="Game assessment setup steps" className="grid gap-2 md:grid-cols-3">
        {steps.map((step) => {
          const selected = active === step.id;
          return (
            <button key={step.id} type="button" aria-current={selected ? "step" : undefined} onClick={() => onChange(step.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-[#008c78] bg-[#eaf8f4] shadow-sm" : "border-[#e0ece8] bg-[#fafdfc] hover:border-[#79bdb0] hover:bg-[#f3faf7]"}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${selected ? "keep-white bg-[#007f70] text-white shadow-sm" : "bg-[#e6f1ee] text-[#344054]"}`}>{step.number}</span>
              <span>
                <span className={`block text-xs font-extrabold ${selected ? "text-[#006f63]" : "text-[#071633]"}`}>{step.title}</span>
                <span className="mt-0.5 block text-[9px] font-medium text-[#71818d]">{step.copy}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="text-[10px] font-bold text-[#344054]"><span>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>{hint && <span className="ml-2 font-medium text-[#8a98a3]">{hint}</span>}<div className="mt-1.5">{children}</div></label>;
}
