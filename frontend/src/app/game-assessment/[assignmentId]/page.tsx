"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- API session/game payloads are schema-driven runtime records. */

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { GameRuntimePlayer } from "@/components/game-runtime-player";
import { API_URL } from "@/lib/api";

type AssessmentRole = "parent" | "student";

function DedicatedGameAssessmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const role: AssessmentRole =
    searchParams.get("role") === "student" ? "student" : "parent";
  const childIdFromUrl = searchParams.get("childId");
  const [assignment, setAssignment] = useState<any | null>(null);
  const [runtime, setRuntime] = useState<any | null>(null);
  const [tutorial, setTutorial] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dashboardUrl =
    role === "student" ? "/student-assessment/dashboard" : "/parent/dashboard";

  const request = async (path: string, init: RequestInit = {}) => {
    const tokenKey = role === "student" ? "studentToken" : "token";
    const tenantId =
      role === "student"
        ? localStorage.getItem("studentSchoolId") || localStorage.getItem("schoolId")
        : localStorage.getItem("schoolId");
    const response = await fetch(`${API_URL}/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem(tokenKey) || ""}`,
        "x-tenant-id": tenantId || "",
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message || "Assessment request failed.",
      );
    }
    return payload;
  };

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const listPath =
          role === "student"
            ? "game-assessments/student/games"
            : "game-assessments/parent/games";
        const assignments = await request(listPath);
        const selected = Array.isArray(assignments)
          ? assignments.find((item: any) => item.id === assignmentId)
          : null;
        if (!selected) throw new Error("This game assignment was not found.");
        const childId = childIdFromUrl || selected.child?.id;
        const tutorialPath =
          role === "student"
            ? `game-assessments/student/games/${assignmentId}/tutorial`
            : `game-assessments/parent/games/${assignmentId}/tutorial`;
        const tutorialInit: RequestInit =
          role === "student"
            ? {}
            : { method: "POST", body: JSON.stringify({ childId }) };
        const tutorialData = await request(tutorialPath, tutorialInit);
        const progressPath =
          role === "student"
            ? `game-assessments/student/games/${assignmentId}/tutorial/progress`
            : `game-assessments/parent/games/${assignmentId}/tutorial/progress`;
        await request(progressPath, {
          method: "POST",
          body: JSON.stringify(
            role === "student"
              ? { tutorialViewed: true }
              : { childId, tutorialViewed: true },
          ),
        });
        const startPath =
          role === "student"
            ? `game-assessments/student/games/${assignmentId}/start`
            : `game-assessments/parent/games/${assignmentId}/start`;
        const session = await request(startPath, {
          method: "POST",
          body: JSON.stringify(role === "student" ? {} : { childId }),
        });
        if (session?.alreadyCompleted)
          throw new Error("This game assignment is already complete.");
        if (!cancelled) {
          setAssignment(selected);
          setTutorial(tutorialData);
          setRuntime({ ...session, status: session.status || "READY" });
        }
      } catch (initializationError) {
        if (!cancelled)
          setError(
            initializationError instanceof Error
              ? initializationError.message
              : "The assessment could not be opened.",
          );
      }
    };
    void initialize();
    return () => {
      cancelled = true;
    };
    // The assignment URL is the initialization boundary for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, role, childIdFromUrl]);

  const complete = async (session: any) => {
    if (!assignment) return;
    try {
      const childId = childIdFromUrl || assignment.child?.id;
      const submitPath =
        role === "student"
          ? `game-assessments/student/games/${assignmentId}/submit`
          : `game-assessments/parent/games/${assignmentId}/submit`;
      await request(submitPath, {
        method: "POST",
        body: JSON.stringify(
          role === "student"
            ? { sessionId: session.id }
            : { childId, sessionId: session.id },
        ),
      });
      router.replace(dashboardUrl);
    } catch (completionError) {
      setError(
        completionError instanceof Error
          ? completionError.message
          : "The assessment result could not be submitted.",
      );
    }
  };

  return (
    <main className="assessment-root fixed inset-0 h-[100dvh] min-h-[100dvh] w-screen overflow-hidden bg-[#071633]">
      {!runtime && !error && (
        <div className="grid h-full place-items-center text-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm font-bold">Preparing assessment…</p>
          </div>
        </div>
      )}
      {error && !runtime && (
        <div className="grid h-full place-items-center p-6">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h1 className="text-lg font-black text-[#071633]">Assessment unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => router.replace(dashboardUrl)}
              className="mt-5 rounded-xl bg-[#007f70] px-5 py-3 text-sm font-black text-white"
            >
              Return to dashboard
            </button>
          </section>
        </div>
      )}
      {runtime && (
        <GameRuntimePlayer
          initial={runtime}
          tutorial={tutorial}
          request={request}
          onClose={() => router.replace(dashboardUrl)}
          onComplete={complete}
          secureMode
        />
      )}
    </main>
  );
}

export default function GameAssessmentRoute() {
  return (
    <Suspense
      fallback={
        <main className="fixed inset-0 grid h-[100dvh] w-screen place-items-center overflow-hidden bg-[#071633] text-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm font-bold">Preparing assessment…</p>
          </div>
        </main>
      }
    >
      <DedicatedGameAssessmentPage />
    </Suspense>
  );
}
