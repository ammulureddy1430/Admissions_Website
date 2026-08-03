"use client";

import { useCallback, useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { AssessmentAiAssistant } from "@/components/assessment-ai-assistant";
import {
  PenTool,
  BookOpen,
  Volume2,
  Mic,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Shield,
  Maximize2,
  Check,
  Loader2,
  Camera,
  CameraOff,
  LogOut,
  Building,
  GraduationCap
} from "lucide-react";

const MAX_SECURITY_WARNINGS = 3;

export default function SecureAssessmentPlayer({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  // Core Data State
  const [assessment, setAssessment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  // Navigation & Answers State
  const [activeStep, setActiveStep] = useState<"WRITTEN" | "READING" | "LISTENING" | "SPEAKING" | "REVIEW">("WRITTEN");
  const [answers, setAnswers] = useState<Record<string, { selectedOption?: string; writtenAnswer?: string }>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Media Recording State
  const [isRecordingReading, setIsRecordingReading] = useState(false);
  const [readingRecordingSeconds, setReadingRecordingSeconds] = useState(0);
  const [readingAudioUrl, setReadingAudioUrl] = useState("");
  const [isRecordingSpeaking, setIsRecordingSpeaking] = useState(false);
  const [speakingRecordingSeconds, setSpeakingRecordingSeconds] = useState(0);
  const [speakingVideoUrl, setSpeakingVideoUrl] = useState("");
  
  // Listening Control State
  const [listeningPlays, setListeningPlays] = useState(0);
  const [listeningTime, setListeningTime] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [listeningError, setListeningError] = useState("");
  const listeningStartedAtRef = useRef<number | null>(null);

  // Security & Monitoring State
  const [isSecureStarted, setIsSecureStarted] = useState(false);
  const [isFullScreenActive, setIsFullScreenActive] = useState(false);
  const [warningsCount, setWarningsCount] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fsExitCount, setFsExitCount] = useState(0);
  type DeviceStatus = "idle" | "checking" | "ready" | "denied";
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
  const [micStatus, setMicStatus] = useState<DeviceStatus>("idle");
  const [deviceError, setDeviceError] = useState("");
  const [devicesInterrupted, setDevicesInterrupted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(0); // seconds

  // Refs for tracking changes
  const answersRef = useRef(answers);
  const timeLeftRef = useRef(timeLeft);
  const suppressSecurityRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lastViolationTimeRef = useRef(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const monitoringPreviewRef = useRef<HTMLVideoElement | null>(null);
  const readingRecorderRef = useRef<MediaRecorder | null>(null);
  const readingRecordingTimerRef = useRef<number | null>(null);
  const readingRecordingStreamRef = useRef<MediaStream | null>(null);
  const speakingRecorderRef = useRef<MediaRecorder | null>(null);
  const speakingRecordingTimerRef = useRef<number | null>(null);
  const speakingRecordingStreamRef = useRef<MediaStream | null>(null);

  // Keep refs up-to-date
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (readingRecordingTimerRef.current) {
        window.clearInterval(readingRecordingTimerRef.current);
      }
      if (readingRecorderRef.current?.state === "recording") {
        readingRecorderRef.current.stop();
      }
      readingRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (speakingRecordingTimerRef.current) {
        window.clearInterval(speakingRecordingTimerRef.current);
      }
      if (speakingRecorderRef.current?.state === "recording") {
        speakingRecorderRef.current.stop();
      }
      speakingRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (activeStep === "LISTENING" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending || isListening) {
      window.speechSynthesis.cancel();
      const startedAt = listeningStartedAtRef.current;
      if (startedAt) {
        setListeningTime((previous) => previous + Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      }
      listeningStartedAtRef.current = null;
      setIsListening(false);
    }
  }, [activeStep, isListening]);

  // Load initial data
  useEffect(() => {
    const savedToken = localStorage.getItem("studentToken");
    if (!savedToken) {
      router.push("/student-assessment");
      return;
    }
    setToken(savedToken);

    async function fetchDetails() {
      try {
        const res = await fetch(`http://localhost:5001/assessments/student/detail/${id}`, {
          headers: {
            "Authorization": `Bearer ${savedToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load secure assessment detail.");
        }

        const data = await res.json();
        
        // If already submitted, prevent re-entry
        if (data.submissions?.[0]?.status === "SUBMITTED" || data.submissions?.[0]?.status === "EVALUATED") {
          setIsSubmitted(true);
          setIsLoading(false);
          return;
        }

        setAssessment(data);
        setActiveStep(
          data.hasWritten
            ? "WRITTEN"
            : data.hasReading
              ? "READING"
              : data.hasListening
                ? "LISTENING"
                : data.hasSpeaking
                  ? "SPEAKING"
                  : "REVIEW",
        );
        const sub = data.submissions?.[0];
        setSubmission(sub);
        
        // Initialize existing answers if any
        if (sub?.answers) {
          const loadedAnswers: Record<string, any> = {};
          sub.answers.forEach((ans: any) => {
            loadedAnswers[ans.questionId] = {
              selectedOption: ans.selectedOption || undefined,
              writtenAnswer: ans.writtenAnswer || undefined,
            };
          });
          setAnswers(loadedAnswers);
        }

        // Initialize monitoring stats
        setWarningsCount(sub?.totalWarnings || 0);
        setTabSwitchCount(sub?.tabSwitchCount || 0);
        setFsExitCount(sub?.fullscreenExitCount || 0);
        setReadingAudioUrl(sub?.readingAudioUrl || "");
        setSpeakingVideoUrl(sub?.speakingVideoUrl || "");
        setListeningPlays(sub?.listeningPlaysUsed || 0);
        setListeningTime(sub?.listeningTimeTaken || 0);

        // Calculate timer remaining
        if (sub?.startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(sub.startedAt).getTime()) / 1000);
          const totalLimit = data.timeLimit * 60;
          const remaining = Math.max(0, totalLimit - elapsed);
          setTimeLeft(remaining);
          // A browser refresh/navigation loses fullscreen and media streams.
          // Return to the preflight screen without recording that restoration
          // as a security violation. The student explicitly re-enters secure
          // mode after the device checks pass.
          setIsSecureStarted(false);
          setDevicesInterrupted(false);
        } else {
          setTimeLeft(data.timeLimit * 60);
        }

        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || "An error occurred while initializing.");
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [id, router]);

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
  };

  // Run a genuine, user-triggered browser device check.
  const requestMediaPermissions = async () => {
    setDeviceError("");
    setCameraStatus("checking");
    setMicStatus("checking");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone access is not supported by this browser.");
      }

      stopMediaStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      mediaStreamRef.current = stream;
      setCameraStatus(stream.getVideoTracks().length ? "ready" : "denied");
      setMicStatus(stream.getAudioTracks().length ? "ready" : "denied");
      requestAnimationFrame(() => {
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      });
      return true;
    } catch (err) {
      console.warn("Media devices permission denied or unavailable", err);
      setCameraStatus("denied");
      setMicStatus("denied");
      setDeviceError(
        err instanceof Error
          ? err.message
          : "We could not access the camera or microphone. Check browser permissions or use demo devices."
      );
      return false;
    }
  };

  useEffect(() => {
    return () => stopMediaStream();
  }, []);

  const attachVideoPreview = useCallback((node: HTMLVideoElement | null) => {
    videoPreviewRef.current = node;
    if (!node || !mediaStreamRef.current) return;

    if (node.srcObject !== mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.play().catch((err) => {
        console.warn("Video preview could not autoplay", err);
      });
    }
  }, []);

  // Keep the verified stream visible throughout the exam and pause the
  // interface immediately if either monitored device is disconnected.
  useEffect(() => {
    if (!isSecureStarted) return;

    const stream = mediaStreamRef.current;
    if (monitoringPreviewRef.current && stream) {
      monitoringPreviewRef.current.srcObject = stream;
    }

    const handleTrackEnded = () => {
      const cameraLive = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live"));
      const micLive = Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live"));
      if (!cameraLive) setCameraStatus("denied");
      if (!micLive) setMicStatus("denied");
      setDevicesInterrupted(true);
    };

    stream?.getTracks().forEach((track) => track.addEventListener("ended", handleTrackEnded));
    return () => {
      stream?.getTracks().forEach((track) => track.removeEventListener("ended", handleTrackEnded));
    };
  }, [isSecureStarted]);

  const reconnectExamDevices = async () => {
    const connected = await requestMediaPermissions();
    if (connected) {
      setDevicesInterrupted(false);
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.addEventListener("ended", () => setDevicesInterrupted(true), { once: true });
      });
      requestAnimationFrame(() => {
        if (monitoringPreviewRef.current && mediaStreamRef.current) {
          monitoringPreviewRef.current.srcObject = mediaStreamRef.current;
        }
      });
    }
  };

  const attachMonitoringPreview = useCallback((node: HTMLVideoElement | null) => {
    monitoringPreviewRef.current = node;
    if (!node || !mediaStreamRef.current) return;

    if (node.srcObject !== mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.play().catch((err) => {
        console.warn("Live monitoring preview could not autoplay", err);
      });
    }
  }, []);

  // Fullscreen Helpers
  const requestFullScreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullScreenActive(true);
      return true;
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      return false;
    }
  };

  const checkFullscreenState = () => {
    const isFull = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullScreenActive(isFull);
    return isFull;
  };

  // Enter Secure Mode Trigger
  const handleEnterSecureMode = async () => {
    const devicesReady =
      !assessment?.proctoringEnabled ||
      (cameraStatus === "ready" && micStatus === "ready");

    if (!devicesReady) {
      setDeviceError("Allow camera and microphone access, then complete the real device check before entering.");
      return;
    }

    setIsLoading(true);
    try {
      // Fullscreen must be requested directly from the user's click. Browsers
      // can reject it if we wait for a network request first.
      const fullscreenStarted = await requestFullScreen();
      if (!fullscreenStarted) {
        throw new Error("Fullscreen permission is required to take this assessment.");
      }

      // Start the server-side attempt after local device checks have passed.
      const res = await fetch(`http://localhost:5001/assessments/student/start/${id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        throw new Error(failure?.message || "Could not start assessment session.");
      }
      const startedAssessment = await res.json();
      setAssessment(startedAssessment);
      setSubmission(startedAssessment.submissions?.[0] || submission);

      setIsSecureStarted(true);
      setIsLoading(false);
    } catch (err: any) {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => undefined);
      }
      setIsFullScreenActive(false);
      alert(err.message || "Start failed. Please try again.");
      setIsLoading(false);
    }
  };

  // Save draft answers batch
  const saveDraftAnswers = async (finalReason?: string) => {
    if (!token || !isSecureStarted || isSubmitted) return;

    const answersPayload = Object.entries(answersRef.current).map(([questionId, ans]) => ({
      questionId,
      selectedOption: ans.selectedOption || null,
      writtenAnswer: ans.writtenAnswer || null,
    }));

    const body = {
      answers: answersPayload,
      readingAudioUrl: readingAudioUrl || null,
      speakingVideoUrl: speakingVideoUrl || null,
      listeningPlaysUsed: listeningPlays,
      listeningTimeTaken: listeningTime,
      totalWarnings: warningsCount,
      tabSwitchCount,
      fullscreenExitCount: fsExitCount,
      submissionReason: finalReason || "NORMAL",
    };

    try {
      await fetch(`http://localhost:5001/assessments/student/save/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn("Draft auto-save sync failed:", err);
    }
  };

  // Security Violations & Event Listeners
  const triggerSecurityViolation = async (type: "fullscreen_exit" | "tab_switch") => {
    if (!isSecureStarted || isSubmitted || suppressSecurityRef.current) return;

    const now = Date.now();
    if (now - lastViolationTimeRef.current < 1500) return;
    lastViolationTimeRef.current = now;

    const nextWarnings = warningsCount + 1;
    const nextTabSwitchCount = tabSwitchCount + (type === "tab_switch" ? 1 : 0);
    const nextFullscreenExitCount = fsExitCount + (type === "fullscreen_exit" ? 1 : 0);
    setWarningsCount(nextWarnings);
    setTabSwitchCount(nextTabSwitchCount);
    setFsExitCount(nextFullscreenExitCount);

    // Save immediate draft with incremented warnings
    await saveDraftAnswers("SECURITY_VIOLATION");
    if (submission?.id) {
      await Promise.allSettled([
        fetch(`http://localhost:5001/assessments/submissions/${submission.id}/security-stats`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalWarnings: nextWarnings,
            tabSwitchCount: nextTabSwitchCount,
            fullscreenExitCount: nextFullscreenExitCount,
          }),
        }),
        fetch(`http://localhost:5001/assessments/submissions/${submission.id}/log-event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eventType: type === "fullscreen_exit" ? "FULLSCREEN_EXIT" : "TAB_CHANGED",
            details: `Security warning ${nextWarnings} of ${MAX_SECURITY_WARNINGS}`,
            browser: navigator.userAgent,
            device: navigator.platform,
          }),
        }),
      ]);
    }

    // Force submit after the third security violation.
    if (nextWarnings >= MAX_SECURITY_WARNINGS) {
      await handleSubmitAssessment("FORCE_SUBMIT", {
        totalWarnings: nextWarnings,
        tabSwitchCount: nextTabSwitchCount,
        fullscreenExitCount: nextFullscreenExitCount,
      });
    }
  };

  useEffect(() => {
    if (!isSecureStarted || isSubmitted) return;

    const handleFullscreenChange = () => {
      const isFull = checkFullscreenState();
      if (!isFull && isSecureStarted && !suppressSecurityRef.current) {
        triggerSecurityViolation("fullscreen_exit");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isSecureStarted) {
        triggerSecurityViolation("tab_switch");
      }
    };

    const handleBlur = () => {
      if (isSecureStarted) {
        triggerSecurityViolation("tab_switch");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Refreshing or leaving this page will immediately submit your assessment.";
      return e.returnValue;
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSecureStarted, isSubmitted, warningsCount, tabSwitchCount, fsExitCount]);

  // Timers: Auto-Save every 20 seconds & Countdown Timer
  useEffect(() => {
    if (!isSecureStarted || isSubmitted) return;

    const autoSaveInterval = setInterval(() => {
      saveDraftAnswers();
    }, 20000);

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          clearInterval(autoSaveInterval);
          handleSubmitAssessment("TIME_EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(autoSaveInterval);
      clearInterval(countdownInterval);
    };
  }, [isSecureStarted, isSubmitted]);

  // Handle MCQ or Written Answer changes
  const handleAnswerChange = (questionId: string, value: string, isMcq: boolean) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: isMcq 
          ? { ...prev[questionId], selectedOption: value }
          : { ...prev[questionId], writtenAnswer: value }
      };
      return updated;
    });
  };

  // Step Sequential Progression Checks
  const hasStepFinished = (step: typeof activeStep) => {
    if (!assessment) return false;
    if (step === "WRITTEN") {
      if (!assessment.hasWritten) return true;
      const writtenQuestions = assessment.questions.filter((q: any) => !q.isListening);
      return writtenQuestions.every((q: any) => answers[q.id]?.selectedOption || answers[q.id]?.writtenAnswer);
    }
    if (step === "READING") {
      return !assessment.hasReading || !!readingAudioUrl;
    }
    if (step === "LISTENING") {
      if (!assessment.hasListening) return true;
      const listeningQuestions = assessment.questions.filter((q: any) => q.isListening);
      return listeningQuestions.every((q: any) => answers[q.id]?.selectedOption || answers[q.id]?.writtenAnswer);
    }
    if (step === "SPEAKING") {
      return !assessment.hasSpeaking || !!speakingVideoUrl;
    }
    return true;
  };

  const handleNextStep = async () => {
    // Save draft answers upon changing sections
    await saveDraftAnswers();

    if (activeStep === "WRITTEN") {
      if (assessment.hasReading) setActiveStep("READING");
      else if (assessment.hasListening) setActiveStep("LISTENING");
      else if (assessment.hasSpeaking) setActiveStep("SPEAKING");
      else setActiveStep("REVIEW");
    } else if (activeStep === "READING") {
      if (assessment.hasListening) setActiveStep("LISTENING");
      else if (assessment.hasSpeaking) setActiveStep("SPEAKING");
      else setActiveStep("REVIEW");
    } else if (activeStep === "LISTENING") {
      if (assessment.hasSpeaking) setActiveStep("SPEAKING");
      else setActiveStep("REVIEW");
    } else if (activeStep === "SPEAKING") {
      setActiveStep("REVIEW");
    }
  };

  const handlePrevStep = () => {
    if (activeStep === "REVIEW") {
      if (assessment.hasSpeaking) setActiveStep("SPEAKING");
      else if (assessment.hasListening) setActiveStep("LISTENING");
      else if (assessment.hasReading) setActiveStep("READING");
      else if (assessment.hasWritten) setActiveStep("WRITTEN");
    } else if (activeStep === "SPEAKING") {
      if (assessment.hasListening) setActiveStep("LISTENING");
      else if (assessment.hasReading) setActiveStep("READING");
      else if (assessment.hasWritten) setActiveStep("WRITTEN");
    } else if (activeStep === "LISTENING") {
      if (assessment.hasReading) setActiveStep("READING");
      else if (assessment.hasWritten) setActiveStep("WRITTEN");
    } else if (activeStep === "READING") {
      if (assessment.hasWritten) setActiveStep("WRITTEN");
    }
  };

  // Media Capture Helpers
  const startRecordingReading = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: preferredType });

      readingRecordingStreamRef.current = stream;
      readingRecorderRef.current = recorder;
      setReadingAudioUrl("");
      setReadingRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setReadingAudioUrl(String(reader.result || ""));
          setIsRecordingReading(false);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
        readingRecordingStreamRef.current = null;
      };
      recorder.onerror = () => {
        setIsRecordingReading(false);
        stream.getTracks().forEach((track) => track.stop());
        readingRecordingStreamRef.current = null;
        alert("Audio recording failed. Please check microphone access and try again.");
      };

      recorder.start(250);
      setIsRecordingReading(true);
      readingRecordingTimerRef.current = window.setInterval(() => {
        setReadingRecordingSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch {
      alert("Microphone access is required to record the reading passage.");
    }
  };

  const stopRecordingReading = () => {
    if (readingRecordingTimerRef.current) {
      window.clearInterval(readingRecordingTimerRef.current);
      readingRecordingTimerRef.current = null;
    }
    if (readingRecorderRef.current?.state === "recording") {
      readingRecorderRef.current.stop();
    }
  };

  const startRecordingSpeaking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const chunks: Blob[] = [];
      const supportedType = ["video/webm;codecs=vp8,opus", "video/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType, videoBitsPerSecond: 600_000 })
        : new MediaRecorder(stream, { videoBitsPerSecond: 600_000 });

      speakingRecordingStreamRef.current = stream;
      speakingRecorderRef.current = recorder;
      setSpeakingVideoUrl("");
      setSpeakingRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        // Keep codecs out of the data-URL MIME prefix. A codec list such as
        // "vp8,opus" contains a comma, which browsers treat as the data-URL
        // separator and leaves an otherwise valid recording unplayable.
        const videoBlob = new Blob(chunks, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setSpeakingVideoUrl(String(reader.result || ""));
          setIsRecordingSpeaking(false);
        };
        reader.readAsDataURL(videoBlob);
        stream.getTracks().forEach((track) => track.stop());
        speakingRecordingStreamRef.current = null;
      };
      recorder.onerror = () => {
        setIsRecordingSpeaking(false);
        stream.getTracks().forEach((track) => track.stop());
        speakingRecordingStreamRef.current = null;
        alert("Video recording failed. Please check camera and microphone access.");
      };

      recorder.start(250);
      setIsRecordingSpeaking(true);
      speakingRecordingTimerRef.current = window.setInterval(() => {
        setSpeakingRecordingSeconds((seconds) => {
          const next = seconds + 1;
          if (assessment?.speakingTimeLimit && next >= assessment.speakingTimeLimit) {
            window.setTimeout(stopRecordingSpeaking, 0);
          }
          return next;
        });
      }, 1000);
    } catch {
      alert("Camera and microphone access are required for the speaking response.");
    }
  };

  const stopRecordingSpeaking = () => {
    if (speakingRecordingTimerRef.current) {
      window.clearInterval(speakingRecordingTimerRef.current);
      speakingRecordingTimerRef.current = null;
    }
    if (speakingRecorderRef.current?.state === "recording") {
      speakingRecorderRef.current.stop();
    }
  };

  const playListeningPrompt = () => {
    const transcript = assessment?.listeningTranscript?.trim();
    if (!transcript) {
      setListeningError("No listening audio prompt has been configured for this assessment.");
      return;
    }
    if (!("speechSynthesis" in window)) {
      setListeningError("Audio playback is not supported by this browser.");
      return;
    }
    if (isListening || listeningPlays >= assessment.listeningPlaysAllowed) return;

    setListeningError("");
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = Math.min(2, Math.max(0.5, Number(assessment.listeningAudioSpeed) || 1));
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      listeningStartedAtRef.current = Date.now();
      setIsListening(true);
      setListeningPlays((previous) => previous + 1);
    };
    utterance.onend = () => {
      const startedAt = listeningStartedAtRef.current;
      if (startedAt) {
        setListeningTime((previous) => previous + Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      }
      listeningStartedAtRef.current = null;
      setIsListening(false);
    };
    utterance.onerror = () => {
      listeningStartedAtRef.current = null;
      setIsListening(false);
      setListeningError("The audio could not be played. Please try again.");
    };
    window.speechSynthesis.speak(utterance);
  };

  // Submit Final Exam API call
  const handleSubmitAssessment = async (
    reason = "NORMAL",
    securityStats?: {
      totalWarnings: number;
      tabSwitchCount: number;
      fullscreenExitCount: number;
    },
  ) => {
    setIsSubmitting(true);
    suppressSecurityRef.current = true;
    
    // Attempt exiting fullscreen mode safely
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}

    // Stops media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    const answersPayload = Object.entries(answersRef.current).map(([questionId, ans]) => ({
      questionId,
      selectedOption: ans.selectedOption || null,
      writtenAnswer: ans.writtenAnswer || null,
    }));

    const body = {
      answers: answersPayload,
      readingAudioUrl: readingAudioUrl || null,
      speakingVideoUrl: speakingVideoUrl || null,
      listeningPlaysUsed: listeningPlays,
      listeningTimeTaken: listeningTime,
      totalWarnings: securityStats?.totalWarnings ?? warningsCount,
      tabSwitchCount: securityStats?.tabSwitchCount ?? tabSwitchCount,
      fullscreenExitCount: securityStats?.fullscreenExitCount ?? fsExitCount,
      submissionReason: reason,
    };

    try {
      const res = await fetch(`http://localhost:5001/assessments/student/submit/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to submit assessment.");
      }

      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch (err) {
      alert("Submission failed. Re-trying...");
      setIsSubmitting(false);
    }
  };

  // Format Timer View
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remains = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs text-slate-400">Securing environment & loading...</p>
        </div>
      </div>
    );
  }

  // Submitted Success Screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center font-sans p-6">
        <div className="text-center space-y-6 max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-[20%] bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-white">Assessment Submitted Successfully</h1>
            <p className="text-xs text-slate-400 leading-normal">
              Your responses, warnings logs, and audio transcripts have been recorded. Your teacher will review your submission shortly.
            </p>
          </div>
          <button
            onClick={() => router.push("/student-assessment/dashboard")}
            className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-850 text-white font-bold py-3.5 rounded-2xl text-xs transition active:scale-95 shadow-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // secure mode overlay
  if (!isSecureStarted && assessment) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex items-center justify-center font-sans p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-850 p-5 md:p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-[20%] bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
            <div className="secure-entry-shield h-11 w-11 bg-[#00665a] border border-white/50 text-white rounded-2xl flex items-center justify-center shadow-sm">
              <Shield className="h-6 w-6 text-white" color="#ffffff" strokeWidth={2.75} />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base">Secure Examination Entry</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Please check settings before beginning your test.</p>
            </div>
          </div>

          <div className="text-xs bg-slate-950/60 border border-slate-900 p-4 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-200">
                  {assessment.proctoringEnabled
                    ? "This assessment is monitored by the school"
                    : "Secure fullscreen assessment"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  The exam opens in fullscreen. Do not switch tabs or leave the browser.
                  {assessment.proctoringEnabled && " Your camera and microphone stay active during the exam."}
                </p>
              </div>
            </div>
          </div>

          {/* Real-time device check */}
          {assessment.proctoringEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Device Checks</h4>
            </div>

            <div className="relative mx-auto aspect-video w-full max-h-56 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              {cameraStatus === "ready" ? (
                <video
                  ref={attachVideoPreview}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Live camera preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  {cameraStatus === "checking" ? (
                    <Loader2 className="mb-2 h-7 w-7 animate-spin text-teal-400" />
                  ) : (
                    <CameraOff className="mb-2 h-7 w-7 text-slate-500" />
                  )}
                  <p className="text-xs font-bold text-slate-300">
                    {cameraStatus === "checking" ? "Checking camera…" : "Camera preview is off"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">Run the device check to start a live preview.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">Camera</span>
                </div>
                <span className={`device-status device-status--${cameraStatus} text-[9px] font-extrabold uppercase`}>
                  {cameraStatus}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">Microphone</span>
                </div>
                <span className={`device-status device-status--${micStatus} text-[9px] font-extrabold uppercase`}>
                  {micStatus}
                </span>
              </div>
            </div>

            {deviceError && (
              <div role="alert" className="device-check-error flex items-start gap-2 rounded-xl p-3 text-[10px] font-semibold leading-relaxed">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-extrabold">Device permission required</p>
                  <p className="mt-0.5">{deviceError}</p>
                  <p className="mt-1 font-normal">Allow camera and microphone in the browser address bar, then select “Retry device check.”</p>
                </div>
              </div>
            )}

            {cameraStatus === "ready" && micStatus === "ready" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-[10px] font-extrabold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Camera and microphone are ready
              </div>
            ) : (
              <button
                type="button"
                onClick={requestMediaPermissions}
                disabled={cameraStatus === "checking" || micStatus === "checking"}
                className="device-check-primary w-full rounded-xl px-3 py-3 text-[10px] font-extrabold transition disabled:cursor-wait disabled:opacity-60"
              >
                {cameraStatus === "checking"
                  ? "Checking camera and microphone…"
                  : cameraStatus === "denied"
                    ? "Retry device check"
                    : cameraStatus === "ready" && micStatus === "ready"
                      ? "Devices connected"
                      : "Test camera and microphone"}
              </button>
            )}
          </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-extrabold text-emerald-900">Device monitoring is not required</p>
                <p className="mt-1 text-[10px] leading-relaxed text-emerald-800">
                  Your school has turned off camera and microphone monitoring for this assessment.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleEnterSecureMode}
              disabled={
                assessment.proctoringEnabled && !(
                  cameraStatus === "ready" &&
                  micStatus === "ready"
                )
              }
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98"
            >
              Enter Secure Exam <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/student-assessment/dashboard")}
              className="w-full text-slate-400 hover:text-slate-200 font-bold py-2 text-xs transition active:scale-98"
            >
              Cancel & Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSecureStarted && devicesInterrupted && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950 p-6 font-sans">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-rose-500/20 bg-slate-900 p-7 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <CameraOff className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Monitoring device disconnected</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Your assessment is paused. Reconnect the camera and microphone to continue.
            </p>
          </div>
          {deviceError && <p className="device-check-error rounded-xl p-3 text-left text-[10px]">{deviceError}</p>}
          <button
            type="button"
            onClick={reconnectExamDevices}
            disabled={cameraStatus === "checking" || micStatus === "checking"}
            className="device-check-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold disabled:cursor-wait disabled:opacity-60"
          >
            {cameraStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {cameraStatus === "checking" ? "Reconnecting…" : "Reconnect devices"}
          </button>
        </div>
      </div>
    );
  }

  // Full Screen Interruption Warning Overlay
  if (isSecureStarted && !isFullScreenActive && !isSubmitted) {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/20 p-6 md:p-8 rounded-3xl space-y-6 text-center shadow-2xl relative">
          <div className="h-16 w-16 bg-[#007f70] border border-white/30 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <AlertTriangle className="h-8 w-8 text-white" color="#ffffff" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="font-extrabold text-white text-base">Fullscreen Mode Interrupted</h2>
            <p className="text-xs text-rose-300 font-semibold leading-relaxed">
              Enforced Secure Mode is active. Exiting full-screen is a security violation and is logged in your report.
            </p>
            <p className="text-[10px] text-slate-500">
              Warnings Count: <span className="text-rose-400 font-bold">{warningsCount} / {MAX_SECURITY_WARNINGS}</span>. The third warning will auto-submit.
            </p>
          </div>
          <button
            onClick={requestFullScreen}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 active:scale-95 animate-bounce"
          >
            <Maximize2 className="h-4 w-4" /> Resume Fullscreen
          </button>
        </div>
      </div>
    );
  }

  const writtenQuestions = assessment?.questions?.filter((q: any) => !q.isListening) || [];
  const listeningQuestions = assessment?.questions?.filter((q: any) => q.isListening) || [];

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 font-sans flex flex-col justify-between select-none">
      
      {/* Secure Header bar */}
      <header className="bg-slate-900/60 border-b border-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-500" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Secure Exam Engine</span>
          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-[9px] font-bold tracking-widest uppercase">Locked</span>
        </div>

        {/* Dynamic Countdown */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold font-mono transition-all ${
          timeLeft < 180 
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" 
            : "bg-slate-950 border-slate-850 text-indigo-400"
        }`}>
          <Clock className="h-4 w-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main taking body */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6 items-start">
        
        {/* Left Side Navigation & Monitor info */}
        <aside className="bg-slate-900/40 border border-slate-850 p-5 rounded-3xl space-y-6">
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Assessment Steps</h4>
            
            <nav className="space-y-2.5">
              {[
                { key: "WRITTEN", label: "1. Written Section", active: assessment?.hasWritten },
                { key: "READING", label: "2. Reading Passage", active: assessment?.hasReading },
                { key: "LISTENING", label: "3. Listening Skills", active: assessment?.hasListening },
                { key: "SPEAKING", label: "4. Speaking Prompt", active: assessment?.hasSpeaking },
                { key: "REVIEW", label: "5. Review & Submit", active: true },
              ].filter(s => s.active).map((step) => {
                const isFinished = hasStepFinished(step.key as any);
                return (
                  <button
                    key={step.key}
                    disabled={activeStep !== step.key && !isFinished}
                    onClick={() => setActiveStep(step.key as any)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                      activeStep === step.key
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                        : isFinished
                          ? "bg-slate-950/60 border-slate-900 text-slate-300 hover:bg-slate-900"
                          : "bg-slate-950/30 border-slate-900/50 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <span>{step.label}</span>
                    {isFinished && <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Live Monitoring Board */}
          <div className="pt-5 border-t border-slate-850 space-y-4">
            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Security Logs</h4>
            
            <div className="space-y-2.5 text-[11px] font-semibold">
              <div className="flex justify-between text-slate-400">
                <span>Tab Swaps:</span>
                <span className={tabSwitchCount > 0 ? "text-amber-400" : "text-slate-200"}>{tabSwitchCount}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Fullscreen Exits:</span>
                <span className={fsExitCount > 0 ? "text-amber-400" : "text-slate-200"}>{fsExitCount}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-dashed border-slate-850">
                <span>Active Warnings:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  warningsCount >= 2 ? "bg-rose-500/20 text-rose-400" : "bg-slate-950 text-slate-300"
                }`}>{warningsCount} / {MAX_SECURITY_WARNINGS}</span>
              </div>
            </div>
          </div>

          {assessment.proctoringEnabled && (
          <div className="pt-5 border-t border-slate-850 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Live Monitoring</h4>
              <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <video
                ref={attachMonitoringPreview}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(event) => {
                  event.currentTarget.play().catch(() => undefined);
                }}
                aria-label="Live monitoring camera preview"
                className="h-full w-full object-cover"
              />
              <div className="keep-white absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/75 px-2 py-1 text-[9px] font-bold text-white">
                <Camera className="h-3 w-3" />
                Camera on
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-2 text-[10px] font-bold text-emerald-800">
              <span className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" /> Microphone connected</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          )}
        </aside>

        {/* Center Panel - Section Player */}
        <main className="bg-slate-900/60 border border-slate-850 p-6 md:p-8 rounded-3xl min-h-[60vh] flex flex-col justify-between shadow-xl">
          
          <div>
            {/* Step 1: Written Section */}
            {activeStep === "WRITTEN" && assessment.hasWritten && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h2 className="text-base font-extrabold text-white">Written Assessment</h2>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">Answer the following questions. Your changes are auto-saved.</p>
                </div>

                {writtenQuestions.length === 0 ? (
                  <p className="text-xs text-slate-500">No written questions assigned.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Render active question index */}
                    {(() => {
                      const q = writtenQuestions[currentQuestionIndex];
                      const val = answers[q.id];
                      return (
                        <div className="space-y-4">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Question {currentQuestionIndex + 1} of {writtenQuestions.length}</span>
                          <h3 className="text-sm font-bold text-white leading-relaxed">{q.questionText}</h3>
                          
                          {q.type === "MCQ" ? (
                            <div className="grid sm:grid-cols-2 gap-3 mt-4">
                              {q.options?.map((opt: string) => (
                                <button
                                  key={opt}
                                  onClick={() => handleAnswerChange(q.id, opt, true)}
                                  className={`p-4 rounded-2xl text-xs text-left font-semibold border transition ${
                                    val?.selectedOption === opt
                                      ? "assessment-option-selected bg-indigo-600/10 border-indigo-500 text-white"
                                      : "bg-slate-950/40 border-slate-900 text-slate-300 hover:bg-slate-900"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4">
                              <textarea
                                value={val?.writtenAnswer || ""}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value, false)}
                                placeholder="Type your detailed answer here..."
                                rows={6}
                                className="w-full text-xs font-semibold rounded-2xl border border-slate-900 bg-slate-955/60 p-4 text-white placeholder-slate-600 outline-none focus:border-indigo-600"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Navigation inside Written list */}
                    <div className="flex gap-2 items-center justify-start border-t border-slate-850 pt-4 mt-6">
                      <button
                        disabled={currentQuestionIndex === 0}
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        className="px-3.5 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        disabled={currentQuestionIndex === writtenQuestions.length - 1}
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-3.5 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Reading Section */}
            {activeStep === "READING" && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h2 className="text-base font-extrabold text-white">Reading Skills</h2>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">Read the passage aloud clearly into your microphone.</p>
                </div>

                <div className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl">
                  <h3 className="text-xs font-extrabold text-indigo-400 mb-3">Passage</h3>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line italic">
                    "{assessment.readingText}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Voice Recording</h4>
                  
                  {isRecordingReading ? (
                    <div className="assessment-recording-active p-6 rounded-2xl flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold">
                          Recording... {Math.floor(readingRecordingSeconds / 60)}:{String(readingRecordingSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecordingReading}
                        className="rounded-xl border border-white bg-white px-5 py-2.5 text-xs font-extrabold !text-[#a91534]"
                      >
                        Stop Recording
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-955/45 border border-slate-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-300 block">Record Reading Passage</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Ensure you are in a quiet room.</p>
                      </div>
                      <button
                        onClick={startRecordingReading}
                        className="assessment-record-button px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition"
                      >
                        <Mic className="h-4 w-4" /> {readingAudioUrl ? "Re-record Voice" : "Start Recording"}
                      </button>
                    </div>
                  )}

                  {readingAudioUrl && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Audio Recording Synced successfully.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Listening Section */}
            {activeStep === "LISTENING" && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h2 className="text-base font-extrabold text-white">Listening Assessment</h2>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">Listen to the spoken audio speed configurations and answer the questions.</p>
                </div>

                {/* Simulated Audio Player */}
                <div className="p-6 bg-slate-950/60 border border-slate-900 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xs font-extrabold text-white">Listening Audio Prompt</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Speed: <span className="font-bold text-indigo-400">{assessment.listeningAudioSpeed}x</span> · Plays: <span className="font-bold text-indigo-400">{listeningPlays} / {assessment.listeningPlaysAllowed}</span></p>
                  </div>
                  <button
                    disabled={isListening || listeningPlays >= assessment.listeningPlaysAllowed}
                    onClick={playListeningPrompt}
                    className="assessment-listen-button px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 disabled:cursor-not-allowed"
                  >
                    <Volume2 className="h-4 w-4" />
                    {isListening ? "Playing Audio..." : "Listen"}
                  </button>
                </div>
                {listeningError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                    {listeningError}
                  </div>
                )}

                {/* Listening Questions */}
                <div className="space-y-4 pt-4">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Listening Comprehension Questions</h4>
                  {listeningQuestions.map((q: any) => {
                    const val = answers[q.id];
                    return (
                      <div key={q.id} className="p-4 bg-slate-950/30 border border-slate-900 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-200">{q.questionText}</p>
                        {q.type === "MCQ" && q.options?.length > 0 ? (
                          <div className="grid sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt: string) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAnswerChange(q.id, opt, true)}
                                className={`p-3.5 rounded-xl text-xs text-left font-semibold border transition ${
                                  val?.selectedOption === opt
                                    ? "assessment-option-selected bg-indigo-600/10 border-indigo-500 text-white"
                                    : "bg-slate-950/40 border-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={val?.writtenAnswer || ""}
                            onChange={(event) => handleAnswerChange(q.id, event.target.value, false)}
                            placeholder="Type your listening answer here..."
                            rows={4}
                            className="w-full rounded-xl border border-slate-900 bg-slate-955/60 p-3.5 text-xs font-semibold text-white placeholder-slate-600 outline-none focus:border-indigo-600"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Speaking Section */}
            {activeStep === "SPEAKING" && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h2 className="text-base font-extrabold text-white">Speaking Skills</h2>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">Express your response orally based on the speaking prompt instructions.</p>
                </div>

                <div className="p-5 bg-slate-950/60 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Speaking Activity</span>
                  <h3 className="text-xs font-black text-indigo-400 mt-2">{assessment.speakingActivityType}</h3>
                  <p className="text-xs text-slate-200 mt-2 leading-relaxed italic">
                    "{assessment.speakingPrompt}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Video response</h4>
                  
                  {isRecordingSpeaking ? (
                    <div className="assessment-recording-active p-6 rounded-2xl flex flex-col items-center justify-center gap-4 sm:flex-row">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold">
                          Recording video... {Math.floor(speakingRecordingSeconds / 60)}:{String(speakingRecordingSeconds % 60).padStart(2, "0")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecordingSpeaking}
                        className="rounded-xl border border-white bg-white px-5 py-2.5 text-xs font-extrabold !text-[#a91534]"
                      >
                        Stop Recording
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-950/40 border border-slate-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-300 block">Record video response</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Maximum duration: {assessment.speakingTimeLimit} seconds.</p>
                      </div>
                      <button
                        onClick={startRecordingSpeaking}
                        className="assessment-record-button px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition"
                      >
                        <Camera className="h-4 w-4" /> {speakingVideoUrl ? "Re-record Video" : "Start Video Capture"}
                      </button>
                    </div>
                  )}

                  {speakingVideoUrl && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Video Recording Synced successfully.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit Section */}
            {activeStep === "REVIEW" && (
              <div className="space-y-6">
                <div className="border-b border-slate-850 pb-4">
                  <h2 className="text-base font-extrabold text-white">Review your responses</h2>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">Verify all answers are submitted before finalizing your exam sheet.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl">
                      <span className="text-slate-500 block">Written Questions Answered</span>
                      <span className="text-white font-extrabold text-base mt-1 block">
                        {writtenQuestions.filter((q: any) => answers[q.id]?.selectedOption || answers[q.id]?.writtenAnswer).length} / {writtenQuestions.length}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl">
                      <span className="text-slate-500 block">Listening Questions Answered</span>
                      <span className="text-white font-extrabold text-base mt-1 block">
                        {listeningQuestions.filter((q: any) => answers[q.id]?.selectedOption || answers[q.id]?.writtenAnswer).length} / {listeningQuestions.length}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-955/35 border border-slate-900 rounded-2xl">
                      <span className="text-slate-500 block">Reading Audio Synced</span>
                      <span className="text-white font-extrabold text-base mt-1 block">
                        {readingAudioUrl ? "YES" : "NO"}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-955/35 border border-slate-900 rounded-2xl">
                      <span className="text-slate-500 block">Speaking Video Synced</span>
                      <span className="text-white font-extrabold text-base mt-1 block">
                        {speakingVideoUrl ? "YES" : "NO"}
                      </span>
                    </div>
                  </div>

                  {/* Warning banner */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Important Notice</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                        Submitting is final. You will not be able to change your answers or records after clicking Submit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section footer with step navigation controls */}
          <div className="flex justify-between items-center border-t border-slate-855 pt-5 mt-8">
            <button
              disabled={
                isSubmitting ||
                activeStep === "WRITTEN" ||
                (activeStep === "READING" && !assessment.hasWritten) ||
                (activeStep === "LISTENING" && !assessment.hasWritten && !assessment.hasReading) ||
                (activeStep === "SPEAKING" && !assessment.hasWritten && !assessment.hasReading && !assessment.hasListening)
              }
              onClick={handlePrevStep}
              className="px-5 py-3 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {activeStep !== "REVIEW" ? (
              <button
                onClick={handleNextStep}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={() => handleSubmitAssessment("NORMAL")}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Submit Assessment
                  </>
                )}
              </button>
            )}
          </div>

        </main>
      </div>

      {activeStep === "WRITTEN" && writtenQuestions[currentQuestionIndex] && (
        <AssessmentAiAssistant
          key={writtenQuestions[currentQuestionIndex].id}
          assessmentId={assessment.id}
          submissionId={submission?.id}
          subject={assessment.subject}
          grade={assessment.grade}
          topic={assessment.title}
          questionId={writtenQuestions[currentQuestionIndex].id}
          questionNumber={currentQuestionIndex + 1}
          tokenStorageKey="studentToken"
          schoolIdStorageKey="studentSchoolId"
          schoolId={assessment.schoolId}
        />
      )}

      <footer className="text-center py-6 border-t border-slate-900 text-[10px] text-slate-600 font-semibold mt-6 relative z-10">
        &copy; {new Date().getFullYear()} Admissions OS. Secure Mode Examination.
      </footer>
    </div>
  );
}
