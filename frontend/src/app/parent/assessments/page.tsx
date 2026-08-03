"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AssessmentAiAssistant } from "@/components/assessment-ai-assistant";
import { 
  ClipboardList, 
  Clock, 
  Award, 
  BookOpen, 
  CheckCircle, 
  HelpCircle, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Play,
  Save,
  CheckCircle2,
  XCircle,
  CornerDownRight,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Mic,
  Square,
  Calendar
} from "lucide-react";

const PENDING_EXIT_SUBMISSION_KEY = "pendingAssessmentExitSubmission";
const displaySlot = (slot: { slotName?: string; startTime?: string; endTime?: string }) => {
  const name = slot.slotName || "";
  if (/mid[- ]morning/i.test(name)) {
    return { ...slot, slotName: "Afternoon Slot 1", startTime: "01:00 PM", endTime: "01:30 PM" };
  }
  if (/late[- ]morning|late afternoon/i.test(name)) {
    return { ...slot, slotName: "Afternoon Slot 2", startTime: "02:00 PM", endTime: "02:30 PM" };
  }
  return slot;
};

export default function ParentAssessments() {
  const router = useRouter();
  const [token, setToken] = useState("");
  
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Active exam canvas states
  const [takingExam, setTakingExam] = useState<any | null>(null);
  const [submissionId, setSubmissionId] = useState("");
  const [answers, setAnswers] = useState<Record<string, { selectedOption?: string; writtenAnswer?: string }>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const assessmentRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const suppressFullscreenViolationRef = useRef(false);
  const exitSubmissionSentRef = useRef(false);
  const lastViolationTimeRef = useRef<number>(0);

  // Result scorecard states
  const [viewingResult, setViewingResult] = useState<any | null>(null);
  const [reassessmentTarget, setReassessmentTarget] = useState<any | null>(null);

  // Proctoring Monitor States
  const [showSecurityNotice, setShowSecurityNotice] = useState(false);
  const [pendingExamToStart, setPendingExamToStart] = useState<any | null>(null);
  const [warningsCount, setWarningsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [warningModalType, setWarningModalType] = useState<'first' | 'final'>('first');
  const [isExitedViolation, setIsExitedViolation] = useState(false);
  const [proctoringTimer, setProctoringTimer] = useState(0);
  const [isFullScreenActive, setIsFullScreenActive] = useState(true);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "requesting" | "ready" | "blocked">("idle");

  // At-School Slot Booking States
  const [bookingAssessment, setBookingAssessment] = useState<any | null>(null);
  const [bookingData, setBookingData] = useState<{
    schedule: any;
    slots: any[];
    currentBooking: any;
    slotBookingDeadline?: string | null;
    slotChangesLocked?: boolean;
  } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [venueChoiceLoadingId, setVenueChoiceLoadingId] = useState<string | null>(null);

  const chooseAssessmentVenue = async (assessmentId: string, venueChoice: "HOME" | "SCHOOL") => {
    setVenueChoiceLoadingId(assessmentId);
    try {
      const response = await fetch(`http://localhost:5001/assessments/parent/${assessmentId}/venue-choice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ venueChoice }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not save the assessment venue.");
      await fetchAssessments();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save the assessment venue.");
    } finally {
      setVenueChoiceLoadingId(null);
    }
  };

  const fetchBookingInfo = async (assessmentId: string, silent = false) => {
    if (!silent) setBookingLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/parent/slots/${assessmentId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBookingData({
          ...data,
          slots: Array.isArray(data?.slots) ? data.slots.map(displaySlot) : [],
          currentBooking: data?.currentBooking
            ? { ...data.currentBooking, slot: displaySlot(data.currentBooking.slot || {}) }
            : null,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingAssessment?.id) return;
    const refreshAvailability = () => {
      void fetchBookingInfo(bookingAssessment.id, true);
    };
    const interval = window.setInterval(refreshAvailability, 30_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAvailability();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [bookingAssessment?.id, token]);

  const handleBookSlot = async (slotId: string) => {
    if (!bookingAssessment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/parent/book-slot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          assessmentId: bookingAssessment.id,
          slotId,
          studentId: bookingAssessment.applicationId,
        })
      });
      if (res.ok) {
        alert("Slot booked successfully!");
        fetchBookingInfo(bookingAssessment.id);
        fetchAssessments();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to book slot.");
      }
    } catch (e) {
      console.error(e);
      alert("Error booking slot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this slot booking?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/parent/cancel-booking/${bookingId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        alert("Booking cancelled successfully.");
        if (bookingAssessment) {
          fetchBookingInfo(bookingAssessment.id);
        }
        fetchAssessments();
      } else {
        alert("Failed to cancel booking.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintHallTicket = () => {
    if (!bookingAssessment || !bookingData || !bookingData.currentBooking) return;
    const booking = bookingData.currentBooking;
    const schedule = bookingData.schedule;
    const slot = booking.slot;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Assessment Hall Ticket</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #071633; padding: 40px; }
            .ticket { border: 2px solid #cfe6e0; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; background: #fafdfc; }
            .header { text-align: center; border-bottom: 2px dashed #cfe6e0; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #007f70; }
            .header p { margin: 5px 0 0 0; font-size: 12px; color: #71818d; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; font-size: 13px; margin-bottom: 20px; }
            .grid div span { display: block; font-size: 10px; color: #71818d; text-transform: uppercase; margin-bottom: 3px; font-weight: bold; }
            .grid div strong { font-size: 13px; color: #071633; }
            .instructions { font-size: 11px; color: #607080; border-top: 1px solid #dceae6; padding-top: 15px; margin-top: 20px; }
            .instructions h3 { margin: 0 0 8px 0; font-size: 12px; color: #071633; }
            .footer { text-align: center; font-size: 10px; color: #71818d; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>ADMISSIONS ASSESSMENT HALL TICKET</h1>
              <p>Please present this document at the campus venue</p>
            </div>
            <div class="grid">
              <div>
                <span>Candidate Name</span>
                <strong>${bookingAssessment.application?.studentFirstName} ${bookingAssessment.application?.studentLastName}</strong>
              </div>
              <div>
                <span>Application ID</span>
                <strong>${bookingAssessment.applicationId.substring(0, 8)}</strong>
              </div>
              <div>
                <span>Assessment</span>
                <strong>${bookingAssessment.title}</strong>
              </div>
              <div>
                <span>Subject & Grade</span>
                <strong>${bookingAssessment.subject} (${bookingAssessment.grade})</strong>
              </div>
              <div>
                <span>Assessment Date</span>
                <strong>${new Date(schedule.assessmentDate).toLocaleDateString()}</strong>
              </div>
              <div>
                <span>Booked Time Slot</span>
                <strong>${slot.slotName} (${slot.startTime} - ${slot.endTime})</strong>
              </div>
              <div>
                <span>Campus & Venue</span>
                <strong>${schedule.campus} - Room ${schedule.roomNumber}</strong>
              </div>
              <div>
                <span>Building & Floor</span>
                <strong>${schedule.building}, ${schedule.floor}</strong>
              </div>
            </div>
            
            ${schedule.documentsRequired && schedule.documentsRequired.length > 0 ? (
              '<div style="font-size: 12px; margin-bottom: 15px;">' +
                '<span style="display: block; font-size: 10px; color: #71818d; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Required Documents</span>' +
                '<ul style="margin: 0; padding-left: 20px; color: #071633;">' +
                  schedule.documentsRequired.map((doc: string) => '<li>' + doc + '</li>').join("") +
                '</ul>' +
              '</div>'
            ) : ""}

            <div class="instructions">
              <h3>Important Instructions</h3>
              <p>${schedule.instructions || "Please report to the coordinator upon arrival."}</p>
            </div>

            <div class="footer">
              For queries, contact: ${schedule.contactPerson} · ${schedule.contactPhone} · ${schedule.contactEmail}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Local proctoring infraction metrics counters (to increment database counts)
  const [dbTabSwitches, setDbTabSwitches] = useState(0);
  const [dbFullscreenExits, setDbFullscreenExits] = useState(0);

  // Exam phases: 'WRITTEN' | 'LISTENING_INTRO' | 'LISTENING_EXEC' | 'READING_INTRO' | 'READING_EXEC' | 'SPEAKING_INTRO' | 'SPEAKING_EXEC' | 'SUBMIT_CONFIRM'
  const [examPhase, setExamPhase] = useState<'WRITTEN' | 'LISTENING_INTRO' | 'LISTENING_EXEC' | 'READING_INTRO' | 'READING_EXEC' | 'SPEAKING_INTRO' | 'SPEAKING_EXEC' | 'SUBMIT_CONFIRM'>('WRITTEN');
  
  // Listening assessment state variables
  const [listeningCompleted, setListeningCompleted] = useState<boolean>(false);
  const [listeningPlaysUsed, setListeningPlaysUsed] = useState<number>(0);
  const [listeningPrepTimeLeft, setListeningPrepTimeLeft] = useState<number>(30);
  const [listeningTimeLeft, setListeningTimeLeft] = useState<number>(600); // 10 minutes default
  const [listeningActiveQuestionIdx, setListeningActiveQuestionIdx] = useState<number>(0);
  const [listeningAudioSpeed, setListeningAudioSpeed] = useState<number>(1.0);
  const [showListeningQuestions, setShowListeningQuestions] = useState<boolean>(false);
  const listeningPrepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listeningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listeningAudioRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  // Reading assessment state variables
  const [readingAudioBase64, setReadingAudioBase64] = useState<string>("");
  const [readingRecording, setReadingRecording] = useState(false);
  const [readingPrepTimeLeft, setReadingPrepTimeLeft] = useState<number>(30);
  const [readingRecordTimeLeft, setReadingRecordTimeLeft] = useState<number>(60);
  const readingMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const readingChunksRef = useRef<Blob[]>([]);
  const readingPrepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const readingRecordTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Speaking assessment state variables
  const [speakingVideoBase64, setSpeakingVideoBase64] = useState<string>("");
  const [speakingRecording, setSpeakingRecording] = useState(false);
  const [speakingPrepTimeLeft, setSpeakingPrepTimeLeft] = useState<number>(60);
  const [speakingRecordTimeLeft, setSpeakingRecordTimeLeft] = useState<number>(120);
  const speakingMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speakingChunksRef = useRef<Blob[]>([]);
  const speakingPrepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingRecordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveAudioSpeakingDraft = async (audioB64?: string, videoB64?: string) => {
    if (!takingExam) return;
    try {
      const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOption: ans.selectedOption,
        writtenAnswer: ans.writtenAnswer
      }));

      await fetch(`http://localhost:5001/assessments/parent/save/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answersPayload,
          readingAudioUrl: audioB64,
          speakingVideoUrl: videoB64,
          listeningPlaysUsed: listeningPlaysUsed,
          listeningTimeTaken: takingExam ? (takingExam.listeningTimeLimit * 60 - listeningTimeLeft) : 0,
        })
      });
    } catch (e: any) {
      console.error("Draft autosave for audio/video failed:", e.message);
    }
  };

  const startListeningPrepCountdown = (listeningPrepTimeLimit: number) => {
    if (listeningPrepTimerRef.current) clearInterval(listeningPrepTimerRef.current);
    setListeningPrepTimeLeft(listeningPrepTimeLimit);
    listeningPrepTimerRef.current = setInterval(() => {
      setListeningPrepTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(listeningPrepTimerRef.current!);
          startListeningExecution();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startListeningExecution = () => {
    if (listeningPrepTimerRef.current) clearInterval(listeningPrepTimerRef.current);
    setExamPhase('LISTENING_EXEC');
    setListeningPlaysUsed(0);
    setListeningActiveQuestionIdx(0);
    setShowListeningQuestions(false);
    
    const timeLimitSeconds = (takingExam?.listeningTimeLimit || 10) * 60;
    setListeningTimeLeft(timeLimitSeconds);
    if (listeningTimerRef.current) clearInterval(listeningTimerRef.current);
    
    listeningTimerRef.current = setInterval(() => {
      setListeningTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(listeningTimerRef.current!);
          if (listeningAudioRef.current) {
            listeningAudioRef.current.pause();
          }
          proceedFromListening();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePlayAudio = () => {
    const maxPlays = takingExam?.listeningPlaysAllowed ?? 1;
    if (maxPlays > 0 && listeningPlaysUsed >= maxPlays) {
      alert(`You have already played this audio ${maxPlays} time(s). No more playbacks allowed.`);
      return;
    }

    if (takingExam?.listeningMaterialType === "AI_GEN" && takingExam?.listeningTranscript) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(takingExam.listeningTranscript);
      utterance.rate = listeningAudioSpeed;
      utterance.onend = handleAudioEnded;
      window.speechSynthesis.speak(utterance);
      setListeningPlaysUsed(prev => prev + 1);
      setShowListeningQuestions(true);
      return;
    }

    if (!listeningAudioRef.current) return;
    
    listeningAudioRef.current.playbackRate = listeningAudioSpeed;
    listeningAudioRef.current.play();
    setListeningPlaysUsed(prev => prev + 1);
    setShowListeningQuestions(true); // Reveal questions on play
  };

  const handleChangeSpeed = (speed: number) => {
    setListeningAudioSpeed(speed);
    
    // For HTML5 uploaded audio
    if (listeningAudioRef.current) {
      listeningAudioRef.current.playbackRate = speed;
    }

    // For Speech Synthesis (AI Voice), dynamically apply the speed by restarting the utterance in real-time
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(takingExam?.listeningTranscript || "");
        utterance.rate = speed;
        utterance.onend = handleAudioEnded;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleAudioEnded = () => {
    setShowListeningQuestions(true);
  };

  const proceedFromListening = () => {
    // Cancel any active SpeechSynthesis or audio playback
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (listeningAudioRef.current) {
      listeningAudioRef.current.pause();
      listeningAudioRef.current.currentTime = 0;
    }

    setListeningCompleted(true);
    if (listeningPrepTimerRef.current) clearInterval(listeningPrepTimerRef.current);
    if (listeningTimerRef.current) clearInterval(listeningTimerRef.current);
    
    void saveDraftAnswerBatch();
    
    if (takingExam?.hasReading) {
      setExamPhase('READING_INTRO');
      startReadingPrepCountdown(30);
    } else if (takingExam?.hasSpeaking) {
      setExamPhase('SPEAKING_INTRO');
      startSpeakingPrepCountdown(60);
    } else {
      setExamPhase('SUBMIT_CONFIRM');
    }
  };

  const startReadingPrepCountdown = (readingTimeLimit: number) => {
    if (readingPrepTimerRef.current) clearInterval(readingPrepTimerRef.current);
    setReadingPrepTimeLeft(readingTimeLimit);
    readingPrepTimerRef.current = setInterval(() => {
      setReadingPrepTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(readingPrepTimerRef.current!);
          void startReadingRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startReadingRecording = async () => {
    if (readingPrepTimerRef.current) clearInterval(readingPrepTimerRef.current);
    setExamPhase('READING_EXEC');
    setReadingRecording(true);
    readingChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      readingMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          readingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(readingChunksRef.current, { type: 'audio/webm' });
        const base64 = await blobToBase64(audioBlob);
        setReadingAudioBase64(base64);
        void saveAudioSpeakingDraft(base64, undefined);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();

      if (readingRecordTimerRef.current) clearInterval(readingRecordTimerRef.current);
      readingRecordTimerRef.current = setInterval(() => {
        setReadingRecordTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(readingRecordTimerRef.current!);
            stopReadingRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Failed to start audio recording:", err);
      alert("Microphone permission is required to perform the Reading Skills Assessment.");
      setReadingRecording(false);
    }
  };

  const stopReadingRecording = () => {
    if (readingRecordTimerRef.current) clearInterval(readingRecordTimerRef.current);
    if (readingMediaRecorderRef.current && readingMediaRecorderRef.current.state !== 'inactive') {
      readingMediaRecorderRef.current.stop();
    }
    setReadingRecording(false);
  };

  const startSpeakingPrepCountdown = (speakingPrepTime: number) => {
    if (speakingPrepTimerRef.current) clearInterval(speakingPrepTimerRef.current);
    setSpeakingPrepTimeLeft(speakingPrepTime);
    speakingPrepTimerRef.current = setInterval(() => {
      setSpeakingPrepTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(speakingPrepTimerRef.current!);
          void startSpeakingRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSpeakingRecording = async () => {
    if (speakingPrepTimerRef.current) clearInterval(speakingPrepTimerRef.current);
    setExamPhase('SPEAKING_EXEC');
    setSpeakingRecording(true);
    speakingChunksRef.current = [];

    try {
      let stream = webcamStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: true });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      speakingMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          speakingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(speakingChunksRef.current, { type: 'video/webm' });
        const base64 = await blobToBase64(videoBlob);
        setSpeakingVideoBase64(base64);
        void saveAudioSpeakingDraft(undefined, base64);
      };

      mediaRecorder.start();

      if (speakingRecordTimerRef.current) clearInterval(speakingRecordTimerRef.current);
      speakingRecordTimerRef.current = setInterval(() => {
        setSpeakingRecordTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(speakingRecordTimerRef.current!);
            stopSpeakingRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Failed to start video recording:", err);
      alert("Camera & Microphone access is required to perform the English Speaking Assessment.");
      setSpeakingRecording(false);
    }
  };

  const stopSpeakingRecording = () => {
    if (speakingRecordTimerRef.current) clearInterval(speakingRecordTimerRef.current);
    if (speakingMediaRecorderRef.current && speakingMediaRecorderRef.current.state !== 'inactive') {
      speakingMediaRecorderRef.current.stop();
    }
    setSpeakingRecording(false);
  };

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    setToken(tok);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    const restoreAndFetch = async () => {
      await flushPendingExitSubmission();
      await fetchAssessments(true);
    };
    void restoreAndFetch();

    const interval = setInterval(() => {
      void fetchAssessments();
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // Handle countdown timer ticking
  useEffect(() => {
    if (takingExam && timeLeft > 0 && !showWarningModal && !isExitedViolation) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [takingExam, timeLeft, showWarningModal, isExitedViolation]);

  // Live timer animation for the proctoring mock camera preview
  useEffect(() => {
    let proctorTimer: NodeJS.Timeout;
    if (takingExam && !showWarningModal && !isExitedViolation) {
      proctorTimer = setInterval(() => {
        setProctoringTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (proctorTimer) clearInterval(proctorTimer);
    };
  }, [takingExam, showWarningModal, isExitedViolation]);

  // Webcam video stream capture hook
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = webcamStreamRef.current || await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to start webcam feed:", err);
      }
    };

    if (takingExam && !isExitedViolation) {
      startWebcam();
    }

    return () => {
      if (!takingExam && webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
    };
  }, [takingExam, isExitedViolation]);

  // Batch Auto-Save tick every 10 seconds
  useEffect(() => {
    if (!takingExam || !submissionId || showWarningModal || isExitedViolation) return;

    const autoSaveInterval = setInterval(() => {
      saveDraftAnswerBatch();
    }, 10000);

    return () => clearInterval(autoSaveInterval);
  }, [takingExam, answers, submissionId, showWarningModal, isExitedViolation]);

  // Fullscreen exit is the only action that increments the security-warning count.
  useEffect(() => {
    if (!takingExam || !submissionId || isExitedViolation) return;

    // Push initial history state to prevent Back button
    window.history.pushState(null, "", window.location.href);

    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsFullScreenActive(isFull);
      if (!isFull && !isExitedViolation && !suppressFullscreenViolationRef.current) {
        logEventToBackend("FULLSCREEN_EXIT", "Student manually exited fullscreen mode");
        triggerSecurityViolation("exited_fullscreen");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isExitedViolation) {
        saveDraftAnswerBatch();
        logEventToBackend("TAB_CHANGED", "Student switched browser tab or minimized window");
        triggerSecurityViolation("tab_changed");
      }
    };

    const handleBlur = () => {
      if (!isExitedViolation) {
        saveDraftAnswerBatch();
        logEventToBackend("FOCUS_LOST", "Student lost window focus (clicked outside or switched apps)");
        triggerSecurityViolation("focus_lost");
      }
    };

    const handleFocus = () => {
      if (!isExitedViolation) {
        logEventToBackend("FOCUS_REGAINED", "Student returned focus to the assessment window");
      }
    };

    const handlePopstate = () => {
      // Stay on page
      window.history.pushState(null, "", window.location.href);
      logEventToBackend("WARNING", "Student attempted browser Back button navigation");
      alert("Back navigation is disabled during the secure assessment session.");
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Leaving or refreshing this page will submit your assessment.";
      return e.returnValue;
    };

    const handlePageHide = () => {
      if (exitSubmissionSentRef.current || !takingExam) return;
      exitSubmissionSentRef.current = true;
      const answersPayload = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        selectedOption: answer.selectedOption,
        writtenAnswer: answer.writtenAnswer,
      }));
      const body = { answers: answersPayload, submissionReason: "LEFT_SITE" };
      localStorage.setItem(
        PENDING_EXIT_SUBMISSION_KEY,
        JSON.stringify({ assessmentId: takingExam.id, body }),
      );
      void fetch(`/backend/assessments/parent/submit/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(body),
        keepalive: true,
      }).then((response) => {
        if (response.ok) localStorage.removeItem(PENDING_EXIT_SUBMISSION_KEY);
      }).catch(() => {
        // The persisted request is retried before assessments are loaded next time.
      });
      webcamStreamRef.current?.getTracks().forEach(track => track.stop());
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        logEventToBackend("WARNING", "Student pressed Escape key");
      }
      if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
        e.preventDefault();
        logEventToBackend("WARNING", "Student attempted page refresh command");
        alert("Page refreshing is disabled. Leaving this page will submit your current progress.");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("popstate", handlePopstate);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("popstate", handlePopstate);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [takingExam, submissionId, answers, warningsCount, isFullScreenActive, isExitedViolation, token]);

  useEffect(() => {
    if (!takingExam) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (listeningAudioRef.current) {
        listeningAudioRef.current.pause();
        listeningAudioRef.current.currentTime = 0;
      }
    }
  }, [takingExam]);

  const logEventToBackend = async (eventType: string, details?: string) => {
    if (!submissionId) return;
    try {
      await fetch(`http://localhost:5001/assessments/submissions/${submissionId}/log-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          eventType,
          details,
          browser: navigator.userAgent,
          device: navigator.platform
        })
      });
    } catch (e) {
      console.error("Failed to log security event:", e);
    }
  };

  const updateSecurityStatsOnBackend = async (warnings: number, nextTabCount: number, nextFsCount: number) => {
    if (!submissionId) return;
    try {
      await fetch(`http://localhost:5001/assessments/submissions/${submissionId}/security-stats`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          totalWarnings: warnings,
          tabSwitchCount: nextTabCount,
          fullscreenExitCount: nextFsCount
        })
      });
    } catch (e) {
      console.error("Failed to update security stats:", e);
    }
  };

  const triggerSecurityViolation = async (violationType: string) => {
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 1500) {
      console.log(`Ignored duplicate security violation within 1.5 seconds: ${violationType}`);
      return;
    }
    lastViolationTimeRef.current = now;

    const nextWarnings = warningsCount + 1;
    let nextTabCount = dbTabSwitches;
    let nextFsCount = dbFullscreenExits;

    if (violationType === "tab_changed" || violationType === "focus_lost") {
      nextTabCount += 1;
      setDbTabSwitches(nextTabCount);
    } else if (violationType === "exited_fullscreen") {
      nextFsCount += 1;
      setDbFullscreenExits(nextFsCount);
    }

    setWarningsCount(nextWarnings);
    await updateSecurityStatsOnBackend(nextWarnings, nextTabCount, nextFsCount);
    await logEventToBackend("WARNING", `Security warning count incremented to ${nextWarnings} due to: ${violationType}`);

    if (nextWarnings === 1) {
      setWarningModalType('first');
      setShowWarningModal(true);
    } else if (nextWarnings === 2) {
      setWarningModalType('final');
      setShowWarningModal(true);
    } else if (nextWarnings >= 3) {
      await handleForceSubmit();
    }
  };

  const requestFullScreen = async () => {
    const elem = document.documentElement;
    try {
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
      console.error("Fullscreen request failed", err);
      return false;
    }
  };

  const handleResumeFullscreen = async () => {
    const success = await requestFullScreen();
    if (success) {
      setShowWarningModal(false);
      await logEventToBackend("FOCUS_REGAINED", "Student returned to fullscreen assessment environment");
    } else {
      alert("Enforced Fullscreen Mode is required. Please click 'Return to Assessment' and allow full-screen.");
    }
  };

  const fetchAssessments = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5001/assessments/parent/list", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch parent assessments");
      setAssessments(await response.json());
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const flushPendingExitSubmission = async () => {
    const pendingRaw = localStorage.getItem(PENDING_EXIT_SUBMISSION_KEY);
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw) as {
        assessmentId?: string;
        body?: { answers?: unknown[]; submissionReason?: string };
      };
      if (!pending.assessmentId || !pending.body) {
        localStorage.removeItem(PENDING_EXIT_SUBMISSION_KEY);
        return;
      }

      const response = await fetch(`/backend/assessments/parent/submit/${pending.assessmentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(pending.body),
      });

      if (response.ok) {
        localStorage.removeItem(PENDING_EXIT_SUBMISSION_KEY);
      }
    } catch (error) {
      console.error("Unable to finalize the assessment left during navigation:", error);
    }
  };

  const requestCameraAccess = async () => {
    setCameraStatus("requesting");
    try {
      if (!webcamStreamRef.current) {
        webcamStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true, // Request microphone permission up-front to prevent fullscreen exits
        });
      }
      setCameraStatus("ready");
      return true;
    } catch (err) {
      console.error("Camera & Microphone permission is required to start the assessment:", err);
      setCameraStatus("blocked");
      return false;
    }
  };

  const stopWebcam = () => {
    webcamStreamRef.current?.getTracks().forEach(track => track.stop());
    webcamStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  };

  const handleStartExam = async (ass: any) => {
    setPendingExamToStart(ass);
    setShowSecurityNotice(true);
    setActionLoading(true);
    try {
      // Resolve camera permission before fullscreen. Permission UI can otherwise
      // force the browser out of fullscreen immediately after the exam opens.
      await requestCameraAccess();
    } finally {
      setActionLoading(false);
    }
  };

  const confirmStartExam = async () => {
    if (!pendingExamToStart) return;

    // Fullscreen must be requested before any awaited work so the browser still
    // treats it as part of the student's click on the confirmation button.
    suppressFullscreenViolationRef.current = false;
    exitSubmissionSentRef.current = false;
    const success = await requestFullScreen();
    if (!success) {
      alert("Fullscreen is required. Please enable fullscreen capability in your browser and try again.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/parent/start/${pendingExamToStart.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ? (Array.isArray(errData.message) ? errData.message.join(", ") : errData.message) : "Failed to load exam detail");
      }
      const details = await res.json();

      setTakingExam(details);
      const sub = details.submissions?.[0];
      if (sub) {
        setSubmissionId(sub.id);
        setWarningsCount(sub.totalWarnings || 0);
        setDbTabSwitches(sub.tabSwitchCount || 0);
        setDbFullscreenExits(sub.fullscreenExitCount || 0);
      }

      // Load saved answers from draft submission
      const savedAnswers: Record<string, any> = {};
      if (sub && sub.answers) {
        sub.answers.forEach((ans: any) => {
          savedAnswers[ans.questionId] = {
            selectedOption: ans.selectedOption || undefined,
            writtenAnswer: ans.writtenAnswer || undefined,
          };
        });
      }
      setAnswers(savedAnswers);

      // Restore active question position
      const savedIndex = localStorage.getItem(`activeQuestion_${details.id}`);
      if (savedIndex) {
        setActiveQuestionIdx(parseInt(savedIndex) || 0);
      } else {
        // Default to the first MCQ question if available in the written questions
        const writtenQs = details.questions?.filter((q: any) => !q.isListening) || [];
        const firstMcqIdx = writtenQs.findIndex((q: any) => q.type === 'MCQ');
        setActiveQuestionIdx(firstMcqIdx !== -1 ? firstMcqIdx : 0);
      }

      // Timer recovery based on persisted startedAt
      if (sub && sub.startedAt) {
        const startedAtTime = new Date(sub.startedAt).getTime();
        const elapsedSeconds = Math.round((Date.now() - startedAtTime) / 1000);
        const limitSeconds = details.timeLimit * 60;
        const remainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
        
        if (remainingSeconds <= 0) {
          setTimeLeft(0);
          alert("This assessment session time has already elapsed.");
          await handleAutoSubmitForce(details.id, sub.id, savedAnswers);
          return;
        } else {
          setTimeLeft(remainingSeconds);
        }
      } else {
        setTimeLeft(details.timeLimit * 60);
      }

      // Reset recording data
      if (listeningPrepTimerRef.current) clearInterval(listeningPrepTimerRef.current);
      if (listeningTimerRef.current) clearInterval(listeningTimerRef.current);
      if (readingPrepTimerRef.current) clearInterval(readingPrepTimerRef.current);
      if (readingRecordTimerRef.current) clearInterval(readingRecordTimerRef.current);
      if (speakingPrepTimerRef.current) clearInterval(speakingPrepTimerRef.current);
      if (speakingRecordTimerRef.current) clearInterval(speakingRecordTimerRef.current);

      setReadingAudioBase64(sub?.readingAudioUrl || "");
      setSpeakingVideoBase64(sub?.speakingVideoUrl || "");
      setListeningPlaysUsed(sub?.listeningPlaysUsed || 0);

      // Filter questions to see if there are written questions
      const writtenQuestionsCount = details.questions?.filter((q: any) => !q.isListening).length || 0;

      if (details.hasWritten && writtenQuestionsCount > 0) {
        setExamPhase('WRITTEN');
      } else if (details.hasListening) {
        setExamPhase('LISTENING_INTRO');
        startListeningPrepCountdown(details.listeningPrepTime || 30);
      } else if (details.hasReading) {
        setExamPhase('READING_INTRO');
        startReadingPrepCountdown(details.readingTime || 60);
      } else if (details.hasSpeaking) {
        setExamPhase('SPEAKING_INTRO');
        startSpeakingPrepCountdown(details.speakingPrepTime || 60);
      } else {
        setExamPhase('SUBMIT_CONFIRM');
      }

      setShowSecurityNotice(false);
      setIsExitedViolation(false);
      setPendingExamToStart(null);
    } catch (e: any) {
      console.error(e);
      suppressFullscreenViolationRef.current = true;
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => undefined);
      }
      alert(`Failed to initialize assessment canvas: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoSubmitForce = async (assessmentId: string, subId: string, savedAnswers: any) => {
    try {
      const answersPayload = Object.entries(savedAnswers).map(([qId, ans]: [string, any]) => ({
        questionId: qId,
        selectedOption: ans.selectedOption,
        writtenAnswer: ans.writtenAnswer
      }));

      await fetch(`http://localhost:5001/assessments/parent/submit/${assessmentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answersPayload,
          submissionReason: "TIMEOUT",
          listeningPlaysUsed: listeningPlaysUsed,
          listeningTimeTaken: takingExam ? (takingExam.listeningTimeLimit * 60 - listeningTimeLeft) : 0,
        })
      });
      stopWebcam();
      fetchAssessments();
    } catch (e: any) {
      console.error("Force timeout submit failed:", e.message);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selectedOption: option
        }
      };
      saveDraftAnswer(questionId, updated[questionId]);
      return updated;
    });
  };

  const handleWrittenAnswerChange = (questionId: string, text: string) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          writtenAnswer: text
        }
      };
      return updated;
    });
  };

  const saveDraftAnswer = async (qId: string, ans: any) => {
    try {
      await fetch(`http://localhost:5001/assessments/parent/save/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: [
            {
              questionId: qId,
              selectedOption: ans.selectedOption,
              writtenAnswer: ans.writtenAnswer
            }
          ]
        })
      });
    } catch (e: any) {
      console.error("Draft autosave failed:", e.message);
    }
  };

  const saveDraftAnswerBatch = async () => {
    if (!takingExam) return;
    try {
      const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOption: ans.selectedOption,
        writtenAnswer: ans.writtenAnswer
      }));

      await fetch(`http://localhost:5001/assessments/parent/save/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answersPayload })
      });
    } catch (e: any) {
      console.error("Batch auto-save failed:", e.message);
    }
  };

  const handleManualSave = async () => {
    setActionLoading(true);
    try {
      await saveDraftAnswerBatch();
      alert("Draft answers saved successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save draft answers.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitExam = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActionLoading(true);
    try {
      const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOption: ans.selectedOption,
        writtenAnswer: ans.writtenAnswer
      }));

      await logEventToBackend("SUBMITTED", "Assessment manually submitted by candidate");

      const res = await fetch(`http://localhost:5001/assessments/parent/submit/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answersPayload,
          submissionReason: "NORMAL",
          readingAudioUrl: readingAudioBase64 || undefined,
          speakingVideoUrl: speakingVideoBase64 || undefined,
          listeningPlaysUsed: listeningPlaysUsed,
          listeningTimeTaken: takingExam ? (takingExam.listeningTimeLimit * 60 - listeningTimeLeft) : 0,
        })
      });

      if (!res.ok) throw new Error("Submit failed");

      exitSubmissionSentRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      setShowSubmitConfirmation(false);
      stopWebcam();
      
      // Exit Fullscreen
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        suppressFullscreenViolationRef.current = true;
        if (document.exitFullscreen) await document.exitFullscreen();
      }

      setTakingExam(null);
      fetchAssessments();
      alert("Assessment submitted successfully. MCQ scores have been calculated.");
    } catch (e) {
      console.error(e);
      alert("Failed to submit assessment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOption: ans.selectedOption,
        writtenAnswer: ans.writtenAnswer
      }));

      await logEventToBackend("SUBMITTED", "Assessment automatically submitted due to time expiration");

      await fetch(`http://localhost:5001/assessments/parent/submit/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answersPayload,
          submissionReason: "TIMEOUT",
          readingAudioUrl: readingAudioBase64 || undefined,
          speakingVideoUrl: speakingVideoBase64 || undefined,
          listeningPlaysUsed: listeningPlaysUsed,
          listeningTimeTaken: takingExam ? (takingExam.listeningTimeLimit * 60 - listeningTimeLeft) : 0,
        })
      });
      exitSubmissionSentRef.current = true;
      stopWebcam();

      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        suppressFullscreenViolationRef.current = true;
        if (document.exitFullscreen) await document.exitFullscreen();
      }

      setTakingExam(null);
      fetchAssessments();
      alert("Time is up! Your assessment was automatically submitted.");
    } catch (e: any) {
      console.error("Auto submission failed:", e.message);
    }
  };

  const handleForceSubmit = async () => {
    exitSubmissionSentRef.current = true;
    setIsExitedViolation(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
      questionId: qId,
      selectedOption: ans.selectedOption,
      writtenAnswer: ans.writtenAnswer
    }));

    try {
      await logEventToBackend("TERMINATED", "Assessment terminated due to three security warnings");

      await fetch(`http://localhost:5001/assessments/parent/submit/${takingExam.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: answersPayload,
          submissionReason: "SECURITY_VIOLATION",
          readingAudioUrl: readingAudioBase64 || undefined,
          speakingVideoUrl: speakingVideoBase64 || undefined,
          listeningPlaysUsed: listeningPlaysUsed,
          listeningTimeTaken: takingExam ? (takingExam.listeningTimeLimit * 60 - listeningTimeLeft) : 0,
        })
      });
      stopWebcam();
    } catch (e) {
      console.error("Force submission failed:", e);
    }
  };

  const handleExitViolationScreen = async () => {
    stopWebcam();
    setIsExitedViolation(false);
    setTakingExam(null);
    setShowWarningModal(false);
    setWarningsCount(0);
    
    // Exit Fullscreen
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      } catch (e) {
        console.error("Failed to exit fullscreen:", e);
      }
    }
    
    fetchAssessments();
  };

  const handleViewResultClick = async (ass: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/assessments/parent/result/${ass.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load result");
      const details = await res.json();
      
      // Load entire detail to list questions and answers side by side
      const detailRes = await fetch(`http://localhost:5001/assessments/parent/detail/${ass.id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const detailJson = await detailRes.json();
      
      setViewingResult({
        ...details,
        questions: detailJson.questions,
        answers: detailJson.submissions?.[0]?.answers || [],
      });
    } catch (e) {
      console.error(e);
      alert("Result scorecard is not published yet.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReassessment = async () => {
    if (!reassessmentTarget) return;
    setActionLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/assessments/parent/reassessment-request/${reassessmentTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to send request");
      setReassessmentTarget(null);
      await fetchAssessments();
      alert("Your request has been sent to the school.");
    } catch (e: any) {
      alert(e.message || "Unable to send the re-assessment request.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleSelectQuestion = (idx: number) => {
    setActiveQuestionIdx(idx);
    if (takingExam) {
      localStorage.setItem(`activeQuestion_${takingExam.id}`, idx.toString());
    }
  };

  const handleDownloadReport = (ass: any, result: any, submission: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalMarks = ass.totalMarks;
    const obtainedScore = result?.score ?? 0;
    const percentage = result?.percentage ?? 0;
    const status = result?.status ?? "N/A";
    const teacherComments = result?.remarks ?? "No feedback provided.";
    
    // Format component marks
    const hasReading = ass.hasReading;
    const hasSpeaking = ass.hasSpeaking;
    const hasListening = ass.hasListening;
    const hasWritten = ass.hasWritten;

    const readingScore = submission?.readingManualScore ?? (submission?.readingAiScore ? Math.round((submission.readingAiScore / 100) * ass.readingTotalMarks) : 0);
    const speakingScore = submission?.speakingManualScore ?? (submission?.speakingAiScore ? Math.round((submission.speakingAiScore / 100) * ass.speakingTotalMarks) : 0);
    const listeningScore = submission?.listeningManualScore ?? (submission?.listeningAiScore ? Math.round((submission.listeningAiScore / 100) * ass.listeningTotalMarks) : 0);
    const writtenScore = submission?.answers?.filter((ans: any) => !ans.isListening).reduce((acc: number, curr: any) => acc + (Number(curr.marksObtained) || 0), 0) ?? 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>Assessment Report - ${ass.title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #071633; padding: 40px; line-height: 1.6; }
            .header { border-bottom: 2px solid #007f70; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; color: #007f70; }
            .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #dceae6; padding-bottom: 5px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #dceae6; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #fafdfc; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
            .badge-pass { background-color: #e6f7f2; color: #007f70; }
            .badge-fail { background-color: #fef2f2; color: #ef4444; }
            .overall-box { background-color: #fafdfc; border: 1px solid #007f70; padding: 20px; border-radius: 8px; margin-top: 20px; display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Admissions Assessment Report</div>
            <div style="font-size: 12px; color: #71818d; margin-top: 5px;">Generated on ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="student-info">
            <div>
              <strong>Student Name:</strong> ${ass.application?.studentFirstName} ${ass.application?.studentLastName}<br/>
              <strong>Grade Level:</strong> ${ass.grade}<br/>
              <strong>Subject:</strong> ${ass.subject}
            </div>
            <div>
              <strong>Assessment Name:</strong> ${ass.title}<br/>
              <strong>Assessment Mode:</strong> ${ass.assessmentMode === 'SCHOOL' ? 'At School Assessment' : 'Home Assessment'}<br/>
              <strong>Date Completed:</strong> ${submission?.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Component Marks Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Assessment Component</th>
                  <th>Obtained Marks</th>
                  <th>Maximum Marks</th>
                </tr>
              </thead>
              <tbody>
                \${hasWritten ? \`<tr><td>Written Component</td><td>\${writtenScore}</td><td>\${ass.totalMarks - (ass.readingTotalMarks || 0) - (ass.speakingTotalMarks || 0) - (ass.listeningTotalMarks || 0)}</td></tr>\` : ""}
                \${hasReading ? \`<tr><td>Reading Skills</td><td>\${readingScore}</td><td>\${ass.readingTotalMarks}</td></tr>\` : ""}
                \${hasListening ? \`<tr><td>Listening Skills</td><td>\${listeningScore}</td><td>\${ass.listeningTotalMarks}</td></tr>\` : ""}
                \${hasSpeaking ? \`<tr><td>Speaking Skills</td><td>\${speakingScore}</td><td>\${ass.speakingTotalMarks}</td></tr>\` : ""}
              </tbody>
            </table>
          </div>

          <div class="overall-box">
            <div>
              <div style="font-size: 14px; font-weight: bold;">Overall Result</div>
              <div style="font-size: 28px; font-weight: 800; margin: 10px 0; color: #007f70;">\${obtainedScore} / \${totalMarks}</div>
              <div>Percentage: <strong>\${percentage}%</strong></div>
              <div style="margin-top: 10px;">
                Status: <span class="badge \${status === 'PASS' ? 'badge-pass' : 'badge-fail'}">\${status}</span>
              </div>
            </div>
            <div>
              <strong>Teacher Feedback:</strong>
              <p style="margin-top: 5px; font-style: italic; white-space: pre-wrap;">\${teacherComments}</p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCertificate = (ass: any, result: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Admissions Certificate - \${ass.application?.studentFirstName} \${ass.application?.studentLastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Montserrat:wght@400;600&display=swap');
            body {
              font-family: 'Montserrat', sans-serif;
              background-color: #f7faf8;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .certificate-container {
              border: 12px double #007f70;
              background-color: #ffffff;
              padding: 50px 80px;
              text-align: center;
              max-width: 800px;
              width: 100%;
              position: relative;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .certificate-container::before {
              content: '';
              position: absolute;
              top: 5px; left: 5px; right: 5px; bottom: 5px;
              border: 2px solid #007f70;
              pointer-events: none;
            }
            .school-name {
              font-size: 14px;
              font-weight: 600;
              letter-spacing: 3px;
              color: #71818d;
              text-transform: uppercase;
            }
            .title {
              font-family: 'Cinzel', serif;
              font-size: 36px;
              color: #007f70;
              margin: 25px 0;
              font-weight: 800;
            }
            .subtitle {
              font-size: 16px;
              color: #071633;
              margin-bottom: 40px;
            }
            .student-name {
              font-family: 'Cinzel', serif;
              font-size: 32px;
              font-weight: bold;
              color: #071633;
              border-bottom: 2px solid #007f70;
              display: inline-block;
              padding-bottom: 5px;
              margin-bottom: 30px;
              min-width: 300px;
            }
            .reason {
              font-size: 14px;
              color: #607080;
              line-height: 1.6;
              margin-bottom: 50px;
              max-width: 600px;
              margin-left: auto;
              margin-right: auto;
            }
            .footer-section {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              font-size: 12px;
              color: #71818d;
            }
            .signature-line {
              border-top: 1px solid #71818d;
              width: 180px;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            <div class="school-name">Horizons School Admissions</div>
            <div class="title">Certificate of Achievement</div>
            <div class="subtitle">This is proudly presented to</div>
            <div class="student-name">\${ass.application?.studentFirstName} \${ass.application?.studentLastName}</div>
            <div class="reason">
              for successfully passing the <strong>\${ass.subject} Assessment</strong> (\${ass.title}) with a score of <strong>\${result?.score} / \${ass.totalMarks}</strong> (\${result?.percentage}%) and qualifying for the next stage in the academic admissions process.
            </div>
            <div class="footer-section">
              <div>
                Date: <strong>\${new Date().toLocaleDateString()}</strong>
              </div>
              <div>
                <div style="font-weight: bold; color: #071633;">Admissions Board</div>
                <div class="signature-line"></div>
                Authorized Signature
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const writtenQuestions = takingExam?.questions?.filter((q: any) => !q.isListening) || [];
  const listeningQuestions = takingExam?.questions?.filter((q: any) => q.isListening) || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Title Header */}
      <div className="flex items-start gap-3 border-b border-[#dceae6] pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f7f2] text-[#007f70]">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#071633]">Assigned Assessments</h1>
          <p className="text-xs text-[#71818d] mt-1">View results, feedback, and request a one-time re-assessment.</p>
        </div>
      </div>

      {/* 4. Main Assessment Workspace Portal */}
      {takingExam && typeof window !== "undefined" && createPortal(
        /* Full-Screen Secure Assessment Canvas */
        <div ref={assessmentRef} className="fixed inset-0 z-[99999] bg-[#fafbfe] w-screen h-screen overflow-hidden flex flex-col font-sans select-none animate-fade-in">
          {/* 1. Assessment rules banner */}
          <div className="assessment-rules-banner bg-[#0f172a] py-2.5 px-6 flex items-center justify-end text-xs font-semibold border-b border-slate-800 shrink-0 select-none">
            <div className="hidden md:flex items-center gap-6 text-[11px] text-slate-100">
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Assessment is being monitored</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Face should remain visible</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Tab switching is prohibited</span>
              <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Full-screen mode enabled</span>
            </div>
          </div>

          {/* 2. Top Header Navigation (Sticky Info) */}
          <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-[#071633]">{takingExam.title}</h2>
              <p className="text-[10px] text-[#71818d] font-semibold mt-0.5">Subject: {takingExam.subject} · Total Marks: {takingExam.totalMarks} pts</p>
            </div>
            
            {/* Warning Counter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#607080] uppercase tracking-wider">Security Warnings:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                warningsCount === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                warningsCount === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                warningsCount === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-red-50 text-red-700 border-red-200'
              }`}>
                {warningsCount} / 3
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div 
                style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca' }}
                className="flex items-center gap-2.5 px-4 py-2 border rounded-xl"
              >
                <Clock style={{ color: '#dc2626' }} className="h-4 w-4 animate-pulse" />
                <div className="text-xs">
                  <span style={{ color: '#991b1b' }} className="text-[9px] font-bold block leading-none">Time Remaining:</span>
                  <span style={{ color: '#b91c1c' }} className="text-sm font-bold font-mono">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-1.5 shrink-0">
            <div 
              className="bg-[#007f70] h-full transition-all duration-300"
              style={{ width: `${takingExam.questions && takingExam.questions.length > 0 ? (Object.keys(answers).length / takingExam.questions.length) * 100 : 100}%` }}
            />
          </div>

          {/* 3. Main Assessment Workspace Split Grid */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane - Active Question / Audio / Video Recording Canvas */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-between bg-slate-50">
                            {examPhase === 'WRITTEN' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Active Question Render */}
                    {(() => {
                      const q = writtenQuestions[activeQuestionIdx];
                      if (!q) return null;
                      const answer = answers[q.id] || {};
                      
                      return (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] bg-[#e6f7f2] text-[#007f70] font-extrabold px-2.5 py-1 rounded-lg uppercase">
                                Question {activeQuestionIdx + 1} of {writtenQuestions.length}
                              </span>
                              <h3 className="text-sm font-extrabold text-[#071633] mt-2 select-text">
                                {q.questionText.replace(/^Re-assessment version \d+:\s*/i, "")}
                              </h3>
                            </div>
                            <span className="text-xs bg-slate-100 font-bold px-3 py-1 rounded-lg text-slate-600 whitespace-nowrap">
                                {q.marks} Marks
                            </span>
                          </div>

                          {q.type === 'MCQ' ? (
                            <div className="grid grid-cols-1 gap-3.5 mt-4">
                              {q.options?.map((opt: string, optIdx: number) => (
                                <div 
                                  key={optIdx}
                                  onClick={() => handleSelectOption(q.id, opt)}
                                  className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${
                                    answer.selectedOption === opt 
                                      ? 'border-[#007f70] bg-[#f0faf7] ring-2 ring-[#007f70]/20' 
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <span className="text-xs font-semibold text-[#071633]">{opt}</span>
                                  <div 
                                    style={{
                                      borderColor: answer.selectedOption === opt ? '#007f70' : '#cbd5e1',
                                      backgroundColor: answer.selectedOption === opt ? '#007f70' : '#ffffff',
                                    }}
                                    className="h-5 w-5 rounded-full border flex items-center justify-center transition-all"
                                  >
                                    {answer.selectedOption === opt && (
                                      <Check 
                                        style={{ color: '#ffffff', stroke: '#ffffff' }} 
                                        className="h-3 w-3" 
                                      />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-[#607080] uppercase tracking-wider">Your Written Answer:</label>
                              <textarea
                                rows={6}
                                value={answer.writtenAnswer || ""}
                                onChange={(e) => handleWrittenAnswerChange(q.id, e.target.value)}
                                onBlur={() => saveDraftAnswer(q.id, answer)}
                                placeholder="Type your detailed written response here..."
                                className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white p-4 text-[#071633] outline-none focus:border-[#007f70] focus:ring-2 focus:ring-[#007f70]/20 resize-y transition-all"
                              />
                              <span className="text-[10px] text-[#71818d] block font-semibold text-right">
                                Draft answers are autosaved in the background.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Back / Next Question Navigation Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-5 mt-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectQuestion(Math.max(0, activeQuestionIdx - 1))}
                      disabled={activeQuestionIdx === 0}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40"
                    >
                      Previous Question
                    </button>
                    
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleManualSave}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (takingExam.hasListening) {
                            setExamPhase('LISTENING_INTRO');
                            startListeningPrepCountdown(takingExam.listeningPrepTime || 30);
                          } else if (takingExam.hasReading) {
                            setExamPhase('READING_INTRO');
                            startReadingPrepCountdown(30);
                          } else if (takingExam.hasSpeaking) {
                            setExamPhase('SPEAKING_INTRO');
                            startSpeakingPrepCountdown(60);
                          } else {
                            setExamPhase('SUBMIT_CONFIRM');
                          }
                        }}
                        className="px-5 py-2.5 bg-[#e6f7f2] hover:bg-[#cceae3] text-[#007f70] text-xs font-extrabold rounded-xl border border-[#b2e2d5] transition-all"
                      >
                        {takingExam.hasListening ? "Proceed to Listening" : takingExam.hasReading ? "Proceed to Reading" : takingExam.hasSpeaking ? "Proceed to Speaking" : "Proceed to Review"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectQuestion(Math.min(writtenQuestions.length - 1, activeQuestionIdx + 1))}
                      disabled={activeQuestionIdx === writtenQuestions.length - 1}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-40"
                    >
                      Next Question
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'LISTENING_INTRO' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-4 max-w-xl mx-auto text-center pt-8">
                    <div className="h-12 w-12 rounded-full bg-[#e6f7f2] flex items-center justify-center mx-auto text-[#007f70] mb-2">
                      <HelpCircle className="h-6 w-6 opacity-80" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#071633]">Component: Listening Skills Assessment</h3>
                    <p className="text-xs text-[#607080] leading-relaxed">
                      {takingExam?.listeningInstructions || "You will listen to an audio/video recording and answer questions based on the material. Ensure your speakers or headphones are working."}
                    </p>
                    <div className="p-4 bg-slate-50 rounded-xl inline-block mt-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Preparation Time Remaining:</span>
                      <span className="text-2xl font-black text-[#071633] font-mono">{listeningPrepTimeLeft}s</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6">
                    <span className="text-[10px] text-slate-400 font-bold">Preparation Step</span>
                    <button
                      type="button"
                      onClick={startListeningExecution}
                      className="px-6 py-3 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Start Listening Exercise Now
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'LISTENING_EXEC' && (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Media Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-[#e6f7f2] text-[#007f70] font-extrabold px-2.5 py-1 rounded-lg uppercase">
                          Listening Exercise
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#007f70] animate-pulse" />
                          <span className="text-xs font-bold text-[#071633] font-mono">
                            Time Left: {formatTime(listeningTimeLeft)}
                          </span>
                        </div>
                      </div>

                      {/* Hidden/Video player elements */}
                      {takingExam?.listeningMaterialType === 'VIDEO' ? (
                        <div className="aspect-video w-full max-w-lg mx-auto bg-black rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center">
                          <video
                            ref={(el) => { listeningAudioRef.current = el; }}
                            src={takingExam?.listeningMaterialUrl || "mock_video.mp4"}
                            onEnded={handleAudioEnded}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <audio
                          ref={(el) => { listeningAudioRef.current = el; }}
                          src={takingExam?.listeningMaterialUrl || "mock_audio.mp3"}
                          onEnded={handleAudioEnded}
                          className="hidden"
                        />
                      )}

                      {/* Controller Card Interface */}
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border rounded-xl">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Plays Remaining:</span>
                          <span className="text-sm font-black text-[#071633]">
                            {takingExam?.listeningPlaysAllowed === 0 
                              ? "Unlimited playbacks" 
                              : `${Math.max(0, takingExam?.listeningPlaysAllowed - listeningPlaysUsed)} of ${takingExam?.listeningPlaysAllowed} plays remaining`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePlayAudio}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                          >
                            <Play className="h-4 w-4" /> Play Audio Material
                          </button>
                        </div>

                        <div className="space-y-1 text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Playback Speed:</span>
                          <div className="flex items-center gap-1">
                            {[0.75, 1.0, 1.25].map(speed => (
                              <button
                                key={speed}
                                type="button"
                                onClick={() => handleChangeSpeed(speed)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  listeningAudioSpeed === speed 
                                    ? 'bg-[#007f70] border-[#007f70] text-white' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Listening Questions Section */}
                    {showListeningQuestions ? (
                      <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-[#071633] uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-[#007f70]" /> Answering Section ({listeningQuestions.length} Questions)
                        </h4>
                        
                        {listeningQuestions.map((q: any, idx: number) => {
                          const answer = answers[q.id] || {};
                          return (
                            <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md uppercase">
                                    Question {idx + 1}
                                  </span>
                                  <h3 className="text-xs font-bold text-[#071633] select-text">
                                    {q.questionText}
                                  </h3>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 bg-slate-50 border rounded-lg text-slate-500 whitespace-nowrap">
                                  {q.marks} Marks
                                </span>
                              </div>

                              {q.type === 'MCQ' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  {q.options?.map((opt: string, optIdx: number) => (
                                    <div 
                                      key={optIdx}
                                      onClick={() => handleSelectOption(q.id, opt)}
                                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${
                                        answer.selectedOption === opt 
                                          ? 'border-[#007f70] bg-[#f0faf7] ring-2 ring-[#007f70]/20' 
                                          : 'border-slate-200 bg-white'
                                      }`}
                                    >
                                      <span className="text-xs font-medium text-[#071633]">{opt}</span>
                                      <div 
                                        style={{
                                          borderColor: answer.selectedOption === opt ? '#007f70' : '#cbd5e1',
                                          backgroundColor: answer.selectedOption === opt ? '#007f70' : '#ffffff',
                                        }}
                                        className="h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all"
                                      >
                                        {answer.selectedOption === opt && (
                                          <Check 
                                            style={{ color: '#ffffff', stroke: '#ffffff' }} 
                                            className="h-3 w-3" 
                                          />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <textarea
                                    rows={3}
                                    value={answer.writtenAnswer || ""}
                                    onChange={(e) => handleWrittenAnswerChange(q.id, e.target.value)}
                                    onBlur={() => saveDraftAnswer(q.id, answer)}
                                    placeholder="Type your response to the listening question..."
                                    className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white p-3 text-[#071633] outline-none focus:border-[#007f70] focus:ring-2 focus:ring-[#007f70]/20 resize-y transition-all"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed rounded-2xl bg-white text-center space-y-2">
                        <Play className="h-8 w-8 text-[#71818d] mx-auto opacity-30 animate-pulse" />
                        <p className="text-xs font-extrabold text-[#071633]">Answering is locked</p>
                        <p className="text-[10px] text-[#71818d] max-w-sm mx-auto">Please click "Play Audio Material" to listen to the passage first. Questions will unlock as soon as playback starts.</p>
                      </div>
                    )}
                  </div>

                  {/* Proceed/Footer navigation */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-5 mt-6 shrink-0 bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold">Listening Step</span>
                    <button
                      type="button"
                      onClick={proceedFromListening}
                      className="px-6 py-3 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Save & Proceed to Next Component
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'READING_INTRO' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-4 max-w-xl mx-auto text-center pt-8">
                    <BookOpen className="h-12 w-12 text-[#007f70] mx-auto opacity-80 animate-bounce" />
                    <h3 className="text-base font-extrabold text-[#071633]">Component 2: Reading Skills Assessment</h3>
                    <p className="text-xs text-[#607080] leading-relaxed">
                      In this section, you will read a passage aloud. Please check that your microphone is working and that you are in a quiet room.
                    </p>
                    
                    <div className="bg-slate-50 p-4 border rounded-xl space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Instructions:</span>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {takingExam.readingInstructions || "You will have 30 seconds to preview the passage silently first. Then, the system will start recording your voice. Please read the passage clearly into your microphone."}
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold">
                      Preparation Time Countdown: <span className="font-mono text-sm">{readingPrepTimeLeft}s</span>
                    </div>
                  </div>

                  <div className="flex justify-center border-t pt-5">
                    <button
                      type="button"
                      onClick={() => startReadingRecording()}
                      className="px-8 py-3 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" /> Start Reading & Recording Now
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'READING_EXEC' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="text-[10px] bg-red-100 text-red-700 font-black px-2.5 py-1 rounded-lg uppercase flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" /> RECORDING AUDIO
                      </span>
                      <span className="text-xs font-extrabold text-[#71818d] font-mono">
                        Time Remaining: {readingRecordTimeLeft}s
                      </span>
                    </div>

                    {/* Renders reading text */}
                    <div className="p-6 bg-slate-50 border rounded-xl select-text">
                      <h4 className="text-sm font-bold text-[#071633] mb-4 border-b pb-2">Please read the following text aloud:</h4>
                      <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap font-serif">
                        {takingExam.readingText}
                      </p>
                    </div>
                  </div>

                  {/* Pulsing Microphone Recording Indicator */}
                  <div className="flex flex-col items-center justify-center py-6 space-y-2.5">
                    <div className="relative flex items-center justify-center">
                      {/* Outer pulsing ring */}
                      <div className="absolute h-16 w-16 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                      {/* Inner soft ring */}
                      <div className="absolute h-12 w-12 rounded-full bg-red-500/10 animate-pulse" />
                      {/* Core circle with icon */}
                      <div className="relative h-11 w-11 rounded-full bg-red-50 flex items-center justify-center border border-red-200 shadow-sm text-red-600">
                        <Mic className="h-5 w-5 animate-pulse" />
                      </div>
                    </div>
                    <span className="text-[10px] text-red-600 font-extrabold tracking-wider uppercase animate-pulse mt-1">
                      Recording Voice... Speak clearly into your microphone
                    </span>
                  </div>

                  <div className="flex justify-center border-t pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        stopReadingRecording();
                        if (takingExam.hasSpeaking) {
                          setExamPhase('SPEAKING_INTRO');
                          startSpeakingPrepCountdown(60);
                        } else {
                          setExamPhase('SUBMIT_CONFIRM');
                        }
                      }}
                      className="assessment-stop-recording-button w-full max-w-xs flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-4 text-sm font-extrabold shadow-[0_8px_20px_rgba(185,28,28,0.35)] transition-all hover:shadow-[0_10px_24px_rgba(185,28,28,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-[0.98]"
                    >
                      <Square className="h-4 w-4" /> Stop & Save Reading Recording
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'SPEAKING_INTRO' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-4 max-w-xl mx-auto text-center pt-8">
                    <ShieldCheck className="h-12 w-12 text-[#007f70] mx-auto opacity-80" />
                    <h3 className="text-base font-extrabold text-[#071633]">Component 3: English Speaking Assessment</h3>
                    <p className="text-xs text-[#607080] leading-relaxed">
                      In this section, you will speak about a topic on video. Please make sure your camera and microphone are connected and your face is visible.
                    </p>

                    <div className="bg-slate-50 p-4 border rounded-xl space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Topic Prompt:</span>
                      <p className="text-xs text-[#071633] font-bold">
                        {takingExam.speakingActivityType} Assessment
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium whitespace-pre-wrap font-sans">
                        Prompt: {takingExam.speakingPrompt}
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold">
                      Preparation Time Countdown: <span className="font-mono text-sm">{speakingPrepTimeLeft}s</span>
                    </div>
                  </div>

                  <div className="flex justify-center border-t pt-5">
                    <button
                      type="button"
                      onClick={() => startSpeakingRecording()}
                      className="px-8 py-3 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" /> Start Speaking & Recording Now
                    </button>
                  </div>
                </div>
              )}

              {examPhase === 'SPEAKING_EXEC' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <span className="text-[10px] bg-red-100 text-red-700 font-black px-2.5 py-1 rounded-lg uppercase flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" /> RECORDING VIDEO + AUDIO
                      </span>
                      <span className="text-xs font-extrabold text-[#71818d] font-mono">
                        Time Remaining: {speakingRecordTimeLeft}s
                      </span>
                    </div>

                    {/* Hidden video element to keep the stream running actively for the browser */}
                    <video
                      ref={(el) => {
                        if (el && webcamStreamRef.current) el.srcObject = webcamStreamRef.current;
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="hidden"
                    />

                    {/* Full-width Speaking Prompt */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">SPEAKING PROMPT:</span>
                      <div className="p-6 bg-slate-50 border rounded-xl select-text">
                        <p className="text-sm text-slate-800 font-extrabold leading-relaxed font-sans">
                          {takingExam.speakingPrompt}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center border-t pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        stopSpeakingRecording();
                        setExamPhase('SUBMIT_CONFIRM');
                      }}
                      className="assessment-stop-recording-button w-full max-w-xs flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-4 text-sm font-extrabold shadow-[0_8px_20px_rgba(185,28,28,0.35)] transition-all hover:shadow-[0_10px_24px_rgba(185,28,28,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-[0.98]"
                    >
                      <Square className="h-4 w-4" /> Stop & Save Speaking Recording
                    </button>
                  </div>
                </div>
              )}
              {examPhase === 'SUBMIT_CONFIRM' && (
                <div className="bg-white p-8 border rounded-2xl shadow-sm space-y-6 flex-1 flex flex-col justify-between animate-fade-in">
                  <div className="space-y-6 max-w-xl mx-auto text-center pt-8">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
                    <h3 className="text-base font-extrabold text-[#071633]">All Assessment Components Completed!</h3>
                    <p className="text-xs text-[#607080] leading-relaxed">
                      Please review the completion status of all parts of your secure assessment before final submission.
                    </p>

                    <div className="border rounded-xl overflow-hidden divide-y text-xs text-left">
                      {takingExam.hasWritten && (
                        <div className="p-4 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="font-bold text-[#071633]">Part 1: Written Questions</p>
                            <p className="text-[10px] text-slate-500">MCQs and Written answers</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Completed</span>
                        </div>
                      )}

                      {takingExam.hasListening && (
                        <div className="p-4 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="font-bold text-[#071633]">Part 2: Listening Skills Assessment</p>
                            <p className="text-[10px] text-slate-500">Audio/video playback and comprehension questions</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Completed</span>
                        </div>
                      )}

                      {takingExam.hasReading && (
                        <div className="p-4 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="font-bold text-[#071633]">Part 3: Reading Skills Assessment</p>
                            <p className="text-[10px] text-slate-500">Audio recording segment</p>
                          </div>
                          {readingAudioBase64 ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Recording Saved</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">No audio</span>
                          )}
                        </div>
                      )}

                      {takingExam.hasSpeaking && (
                        <div className="p-4 flex items-center justify-between bg-slate-50/50">
                          <div>
                            <p className="font-bold text-[#071633]">Part 4: English Speaking Assessment</p>
                            <p className="text-[10px] text-slate-500">Video recording proctor segment</p>
                          </div>
                          {speakingVideoBase64 ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">Video Saved</span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">No video</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 border-t pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        if (takingExam.hasWritten && writtenQuestions.length > 0) setExamPhase('WRITTEN');
                        else if (takingExam.hasListening) setExamPhase('LISTENING_EXEC');
                        else if (takingExam.hasReading) setExamPhase('READING_INTRO');
                        else if (takingExam.hasSpeaking) setExamPhase('SPEAKING_INTRO');
                      }}
                      className="px-6 py-2.5 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      Go Back & Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitExam()}
                      className="px-8 py-2.5 bg-[#007f70] hover:bg-[#00665a] text-white text-xs font-extrabold rounded-xl shadow-md transition-all"
                    >
                      Submit Final Assessment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Pane - Sidebar Proctoring Info (Webcam Preview & Question Palette) */}
            <div className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto shrink-0 select-none">
              <div className="space-y-6">
                
                {/* 4. Camera preview */}
                <div 
                  style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                  className="border rounded-2xl overflow-hidden p-3 relative shadow-lg text-slate-100"
                >
                  <div 
                      style={{ backgroundColor: '#020617', borderColor: '#1e293b' }}
                      className="aspect-video w-full border rounded-xl relative flex flex-col items-center justify-center overflow-hidden bg-black"
                  >
                    {/* Live Video Element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      className="absolute inset-0"
                    />

                    {/* Camera Timer */}
                    <div 
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: '#94a3b8', zIndex: 10 }}
                      className="absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
                    >
                      {formatTime(proctoringTimer)}
                    </div>
                  </div>
                </div>

                {examPhase === 'WRITTEN' ? (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Question Palette</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {writtenQuestions.map((q: any, idx: number) => {
                        const isAnswered = !!(answers[q.id]?.selectedOption || answers[q.id]?.writtenAnswer);
                        const isActive = idx === activeQuestionIdx;
                        
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(idx)}
                            className={`h-9 w-9 rounded-lg text-xs font-bold transition-all border flex items-center justify-center ${
                              isActive ? 'border-[#007f70] bg-[#e6f7f2] text-[#007f70] ring-2 ring-[#007f70]/30 font-black' :
                              isAnswered ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                              'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold pt-2">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" /> Answered</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border border-slate-300 bg-white" /> Unanswered</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded border-2 border-[#007f70] bg-[#e6f7f2]" /> Current</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assessment Steps</h4>
                    <div className="space-y-4">
                      {takingExam.hasWritten && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border bg-emerald-100 border-emerald-200 text-emerald-700 font-extrabold">
                            ✓
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 leading-none">Written Assessment</p>
                            <p className="text-[9px] mt-0.5 font-semibold text-slate-400">
                              Completed
                            </p>
                          </div>
                        </div>
                      )}

                      {takingExam.hasListening && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                            ['LISTENING_INTRO', 'LISTENING_EXEC'].includes(examPhase)
                              ? 'bg-[#e6f7f2] border-[#007f70] text-[#007f70] animate-pulse font-black'
                              : listeningCompleted || ['READING_INTRO', 'READING_EXEC', 'SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase)
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {listeningCompleted || ['READING_INTRO', 'READING_EXEC', 'SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase) ? "✓" : "2"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 leading-none">Listening Skills</p>
                            <p className="text-[9px] mt-0.5 font-semibold text-slate-400">
                              {['LISTENING_INTRO', 'LISTENING_EXEC'].includes(examPhase) ? 'In Progress...' : (listeningCompleted || ['READING_INTRO', 'READING_EXEC', 'SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase)) ? 'Completed' : 'Pending'}
                            </p>
                          </div>
                        </div>
                      )}

                      {takingExam.hasReading && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                            ['READING_INTRO', 'READING_EXEC'].includes(examPhase)
                              ? 'bg-[#e6f7f2] border-[#007f70] text-[#007f70] animate-pulse font-black'
                              : readingAudioBase64 || ['SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase)
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {readingAudioBase64 || ['SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase) ? "✓" : "3"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 leading-none">Reading Skills</p>
                            <p className="text-[9px] mt-0.5 font-semibold text-slate-400">
                              {['READING_INTRO', 'READING_EXEC'].includes(examPhase) ? 'In Progress...' : (readingAudioBase64 || ['SPEAKING_INTRO', 'SPEAKING_EXEC', 'SUBMIT_CONFIRM'].includes(examPhase)) ? 'Completed' : 'Pending'}
                            </p>
                          </div>
                        </div>
                      )}

                      {takingExam.hasSpeaking && (
                        <div className="flex items-center gap-3 text-xs">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                            ['SPEAKING_INTRO', 'SPEAKING_EXEC'].includes(examPhase)
                              ? 'bg-[#e6f7f2] border-[#007f70] text-[#007f70] animate-pulse font-black'
                              : speakingVideoBase64 || ['SUBMIT_CONFIRM'].includes(examPhase)
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {speakingVideoBase64 || ['SUBMIT_CONFIRM'].includes(examPhase) ? "✓" : "4"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 leading-none">Speaking Assessment</p>
                            <p className="text-[9px] mt-0.5 font-semibold text-slate-400">
                              {['SPEAKING_INTRO', 'SPEAKING_EXEC'].includes(examPhase) ? 'In Progress...' : (speakingVideoBase64 || ['SUBMIT_CONFIRM'].includes(examPhase)) ? 'Completed' : 'Pending'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer Details */}
              <div className="border-t border-slate-200 pt-4 mt-6 text-[10px] text-slate-400 space-y-1">
                <p>Attempt: <span className="font-bold text-slate-600">Attempt #1</span></p>
                <p>Candidate ID: <span className="font-bold text-slate-600">{submissionId.slice(0, 8)}...</span></p>
                <p>Proctored session. IP logged.</p>
              </div>
            </div>
          </div>
          {examPhase === 'WRITTEN' && (
            <AssessmentAiAssistant
              key={writtenQuestions[activeQuestionIdx]?.id}
              assessmentId={takingExam.id}
              submissionId={submissionId}
              subject={takingExam.subject}
              grade={takingExam.grade}
              topic={takingExam.title}
              questionId={writtenQuestions[activeQuestionIdx]?.id}
              questionNumber={activeQuestionIdx + 1}
            />
          )}
        </div>,
        document.body
      )}

      {!takingExam && (
        /* List view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full text-center py-20 bg-white border border-[#dceae6] rounded-2xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#007f70] mx-auto" />
              <p className="text-xs text-[#71818d] mt-2">Loading student assigned assessments...</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white border border-[#dceae6] rounded-2xl space-y-2">
              <ClipboardList className="h-10 w-10 text-[#71818d] mx-auto opacity-40" />
              <p className="text-xs text-[#71818d] font-bold">No assigned assessments found.</p>
              <p className="text-[11px] text-[#71818d]">When the school assigns assessment tests to your candidates, they will appear here.</p>
            </div>
          ) : (
            assessments.map((a) => {
              const submission = a.submissions?.[0];
              const result = a.results?.[0];
              const reassignmentRequest = a.reassignmentRequests?.[0];

              // Format date
              const submissionDate = submission?.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A';

              return (
                <div key={a.id} className="relative overflow-hidden bg-white border border-[#dceae6] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between gap-5">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#008f80]" />
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 max-w-[48%] flex-col items-start gap-1.5">
                        <span className="bg-[#e6f7f2] text-[#007f70] text-[10px] leading-4 font-bold px-2.5 py-1 rounded-lg uppercase break-words">
                          {String(a.subject).toLowerCase() === "all" ? "Assessment" : a.subject}
                        </span>
                        {a.assessmentMode === 'SCHOOL' && (
                          <span className="inline-flex px-2 py-1 rounded-md text-[9px] leading-3 font-bold uppercase bg-amber-50 text-amber-700">At School</span>
                        )}
                        {a.assessmentMode === 'BOTH' && a.venueChoice && (
                          <span className={`inline-flex px-2 py-1 rounded-md text-[9px] leading-3 font-bold uppercase ${a.venueChoice === 'SCHOOL' ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}`}>
                            {a.venueChoice === 'SCHOOL' ? 'At School selected' : 'At Home selected'}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col items-end gap-1.5">
                        {result ? (
                          <span className={`inline-flex max-w-full items-center px-2.5 py-1 rounded-full text-[9px] leading-3 font-bold uppercase text-right ${
                            result.status === 'PASS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {String(result.status).replaceAll('_', ' ')}
                          </span>
                        ) : (
                          <span className={`inline-flex max-w-full items-center px-2 py-1 rounded-md text-[9px] leading-3 font-bold uppercase text-right ${
                            submission?.status === 'REVIEWED' ? 'bg-sky-100 text-sky-800' :
                            submission?.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' :
                            submission?.status === 'SUBMITTED' ? 'bg-indigo-100 text-indigo-800' :
                            submission?.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {submission?.status === "IN_PROGRESS" && !submission?.startedAt
                              ? "READY"
                              : String(submission?.status || "PENDING").replaceAll('_', ' ')}
                          </span>
                        )}
                        {a.attemptNumber > 1 && (
                          <span className="inline-flex px-2 py-1 rounded-md text-[9px] leading-3 font-bold uppercase bg-blue-100 text-blue-800">Re-Assigned</span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-4 line-clamp-2 text-base font-extrabold leading-6 text-[#071633]">
                      {String(a.title).toLowerCase() === "all" ? "General Assessment" : a.title}
                    </h3>
                    
                    <div className="mt-2 text-xs text-[#71818d]">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-[#071633]">
                          {[a.application?.studentFirstName, a.application?.studentLastName].filter(Boolean).join(" ") || "—"}
                        </span>
                        <span className="text-[#b1bfba]">•</span>
                        <span>{a.grade}</span>
                        {submission?.submittedAt && (
                          <>
                            <span className="text-[#b1bfba]">•</span>
                            <span>{submissionDate}</span>
                          </>
                        )}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#526a77]">
                        <Calendar className="h-3.5 w-3.5 text-[#008f80]" />
                        <span className="font-bold text-[#344054]">Assessment Date:</span>
                        {(() => {
                          const dateValue = a.slotBookings?.[0]?.slot?.schedule?.assessmentDate || a.dueDate;
                          return dateValue
                            ? new Date(dateValue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Not scheduled';
                        })()}
                      </p>

                      {result ? (
                        <div className="grid grid-cols-2 gap-2 pt-4">
                          <div className="rounded-xl bg-[#f2faf8] px-3 py-2.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-[#71818d]">Score</span>
                            <span className="mt-0.5 block text-base font-extrabold text-[#007f70]">{result.score} / {a.totalMarks}</span>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wide text-[#71818d]">Percentage</span>
                            <span className="mt-0.5 block text-base font-extrabold text-[#071633]">{Math.round(result.percentage)}%</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {result ? (
                      <div className="w-full space-y-2">
                        <button
                          onClick={() => handleViewResultClick(a)}
                          className="w-full flex items-center justify-center gap-1 bg-[#007f70] hover:bg-[#00665a] text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                        >
                          <Award className="h-4 w-4" /> View Details
                        </button>
                        
                        {a.attemptNumber < 2 && (
                          reassignmentRequest?.status === 'PENDING' || reassignmentRequest?.status === 'APPROVED' ? (
                            <button
                              disabled
                              className="w-full flex items-center justify-center gap-1 bg-slate-100 text-[#71818d] border border-[#dceae6] py-2 rounded-xl text-xs font-semibold cursor-not-allowed"
                            >
                              {reassignmentRequest.status === 'PENDING' ? 'Re-assessment Request Pending' : 'Re-assessment Approved'}
                            </button>
                          ) : (
                            <button
                              onClick={() => setReassessmentTarget(a)}
                              className="w-full flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-[#007f70] border border-[#007f70] py-2 rounded-xl text-xs font-semibold transition-colors"
                            >
                              Request Re-assessment
                            </button>
                          )
                        )}
                        {a.attemptNumber >= 2 && (
                          <p className="pt-1 text-center text-[10px] font-bold text-amber-700">
                            Assessment limit is reached
                          </p>
                        )}
                      </div>
                    ) : a.assessmentMode === 'BOTH' && !a.venueChoice ? (
                      <div className="w-full rounded-xl border !border-[#cbd5e1] !bg-[#f8fafc] p-4 shadow-sm">
                        <p className="text-xs font-extrabold !text-[#0f172a]">Where will the student take this assessment?</p>
                        <p className="mt-1.5 text-[10px] font-medium leading-4 !text-[#475569]">
                          Submit the venue by {a.venueChoiceDeadline ? new Date(a.venueChoiceDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the school deadline'}.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={venueChoiceLoadingId === a.id || a.venueChoiceLocked}
                            onClick={() => chooseAssessmentVenue(a.id, 'HOME')}
                            className="rounded-lg border !border-[#0284c7] !bg-white px-3 py-2.5 text-[10px] font-extrabold !text-[#0369a1] transition hover:!bg-[#f0f9ff] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            At Home
                          </button>
                          <button
                            type="button"
                            disabled={venueChoiceLoadingId === a.id || a.venueChoiceLocked}
                            onClick={() => chooseAssessmentVenue(a.id, 'SCHOOL')}
                            className="rounded-lg border !border-[#047857] !bg-[#047857] px-3 py-2.5 text-[10px] font-extrabold !text-white transition hover:!bg-[#065f46] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            At School
                          </button>
                        </div>
                        {a.venueChoiceLocked && <p className="mt-2 text-[9px] font-bold !text-[#b91c1c]">The venue-selection deadline has passed. Contact the school.</p>}
                      </div>
                    ) : a.assessmentMode === 'SCHOOL' || (a.assessmentMode === 'BOTH' && a.venueChoice === 'SCHOOL') ? (
                      <div className="w-full flex flex-col gap-2">
                        {a.slotBookings && a.slotBookings.length > 0 && a.slotBookings[0].bookingStatus !== 'CANCELLED' ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center">
                            <p className="text-xs font-bold text-emerald-800">Slot Booked Successfully</p>
                            <p className="mt-1 text-[10px] text-[#071633] font-bold">
                              {displaySlot(a.slotBookings[0].slot || {}).slotName} · {displaySlot(a.slotBookings[0].slot || {}).startTime} - {displaySlot(a.slotBookings[0].slot || {}).endTime}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
                            <p className="text-xs font-bold text-amber-800">At-school assessment assigned</p>
                            <p className="mt-0.5 text-[9px] text-amber-700">Please book a slot to schedule the test.</p>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setBookingAssessment(a);
                            fetchBookingInfo(a.id);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                          <Calendar className="h-3.5 w-3.5" /> Manage Slot Booking
                        </button>
                      </div>
                    ) : submission?.status === 'SUBMITTED' || submission?.status === 'UNDER_REVIEW' || submission?.status === 'REVIEWED' ? (
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-1 bg-slate-100 text-[#71818d] py-2.5 rounded-xl text-xs font-semibold border border-[#dceae6] cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4 text-emerald-500" /> Awaiting Evaluation
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartExam(a)}
                        className="w-full flex items-center justify-center gap-1.5 bg-[#007f70] hover:bg-[#00665a] text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" /> {submission?.startedAt ? 'Resume Assessment' : 'Start Assessment'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Result scorecard overlay */}
      {viewingResult && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#071633]">Assessment Result Scorecard</h3>
                <p className="text-[10px] text-[#71818d] mt-0.5">{viewingResult.assessment?.title}</p>
              </div>
            </div>
 
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#fcfdfd]">
              {/* Scorecard circular metrics panel */}
              <div className="p-6 bg-white border border-[#dceae6] rounded-2xl shadow-sm text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase ${
                    viewingResult.status === 'PASS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {viewingResult.status === 'PASS' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    RESULT: {viewingResult.status}
                  </span>
                </div>
 
                <div className="grid grid-cols-3 gap-3 divide-x divide-[#dceae6]">
                  <div>
                    <span className="text-[#71818d] text-[10px] font-bold uppercase block mb-1">Score Obtained</span>
                    <span className="text-lg font-extrabold text-[#007f70]">
                      {viewingResult.score} / {viewingResult.assessment?.totalMarks} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71818d] text-[10px] font-bold uppercase block mb-1">Percentage</span>
                    <span className="text-lg font-extrabold text-[#071633]">
                      {Math.round(viewingResult.percentage)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[#71818d] text-[10px] font-bold uppercase block mb-1">Correct Answers</span>
                    <span className="text-lg font-extrabold text-emerald-600">
                      {viewingResult.correctCount} correct
                    </span>
                  </div>
                </div>

                {viewingResult.teacherComments && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-700 mt-2 font-medium">
                    <span className="text-[10px] text-[#607080] font-bold uppercase tracking-wider block mb-1">Teacher Feedback:</span>
                    "{viewingResult.teacherComments}"
                  </div>
                )}
              </div>

              {viewingResult.assessment?.hasListening && (
                <div className="p-5 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-4 font-sans">
                  <div className="border-b border-[#dceae6] pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-[#007f70] uppercase tracking-wider">Listening Skills Scorecard</h4>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      Score: {viewingResult.listeningManualScore ?? viewingResult.listeningAiScore ?? 0} / {viewingResult.assessment?.listeningTotalMarks || 20} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Plays Used:</span>
                      <span className="font-bold text-[#071633]">{viewingResult.listeningPlaysUsed || 0} plays</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Max Plays Allowed:</span>
                      <span className="font-bold text-[#071633]">
                        {viewingResult.assessment?.listeningPlaysAllowed === 0 ? "Unlimited" : `${viewingResult.assessment?.listeningPlaysAllowed || 1} plays`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Audio Speed:</span>
                      <span className="font-bold text-[#071633]">{viewingResult.assessment?.listeningAudioSpeed || 1}x</span>
                    </div>
                    <div>
                      <span className="text-[#71818d] block font-bold mb-0.5">Time Taken:</span>
                      <span className="font-bold text-[#071633]">
                        {viewingResult.listeningTimeTaken ? `${Math.floor(viewingResult.listeningTimeTaken / 60)}m ${viewingResult.listeningTimeTaken % 60}s` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {viewingResult.listeningEvaluation && (
                    <div className="bg-[#eefaf7] border border-[#b2e2d5] p-4 rounded-xl space-y-3 text-xs">
                      <h5 className="font-bold text-[#00665a] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#009b87]" /> AI Listening Evaluation Report
                      </h5>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          ["Accuracy", viewingResult.listeningEvaluation.listeningAccuracy],
                          ["Comprehension", viewingResult.listeningEvaluation.comprehensionScore],
                          ["Attention", viewingResult.listeningEvaluation.attentionScore],
                          ["Response Accuracy", viewingResult.listeningEvaluation.responseAccuracy]
                        ].map(([label, score]) => (
                          <div key={label} className="bg-white p-2 border rounded-xl">
                            <span className="text-[9px] text-[#71818d] block font-bold mb-0.5">{label}:</span>
                            <span className="font-bold text-xs text-[#071633]">{score}%</span>
                          </div>
                        ))}
                      </div>

                      {viewingResult.listeningEvaluation.feedback && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#cceae3] text-[10px]">
                          <div>
                            <span className="font-bold text-[#00665a] block mb-1">Strengths:</span>
                            <ul className="list-disc pl-3 space-y-0.5 text-slate-700">
                              {viewingResult.listeningEvaluation.feedback.strengths?.map((str: string, i: number) => (
                                <li key={i}>{str}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-bold text-[#00665a] block mb-1">Areas for Improvement:</span>
                            <ul className="list-disc pl-3 space-y-0.5 text-slate-700">
                              {viewingResult.listeningEvaluation.feedback.improvements?.map((imp: string, i: number) => (
                                <li key={i}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewingResult.listeningTeacherRemarks && (
                    <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-700">
                      <span className="text-[10px] text-[#607080] font-bold uppercase tracking-wider block mb-1">Teacher Listening Remarks:</span>
                      "{viewingResult.listeningTeacherRemarks}"
                    </div>
                  )}
                </div>
              )}
 
              {/* Review of questions and candidate answers */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#607080] uppercase tracking-wider">Evaluation Review</h4>
                
                {viewingResult.questions.map((q: any, idx: number) => {
                  const ans = viewingResult.answers.find((a: any) => a.questionId === q.id);
                  
                  return (
                    <div key={q.id} className="p-4 bg-white border border-[#dceae6] rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-xs font-bold text-[#071633]">
                          Q{idx + 1}. {q.questionText.replace(/^Re-assessment version \d+:\s*/i, "")}
                        </h4>
                        <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 ${
                          ans?.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ans?.marksObtained || 0} / {q.marks} pts
                        </span>
                      </div>
 
                      {q.type === 'MCQ' ? (
                        <div className="space-y-2 bg-[#fdfdfd] p-3 rounded-xl border border-slate-100 text-xs">
                          <p className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Correct Option: {q.correctAnswer}
                          </p>
                          <p className={`flex items-center gap-1.5 font-semibold ${ans?.isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                            {ans?.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            Your Choice: {ans?.selectedOption || "(Skipped)"}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <span className="text-[#71818d] text-[9px] font-bold block mb-1 uppercase">Your Answer:</span>
                            <p className="text-slate-800 font-medium whitespace-pre-wrap">{ans?.writtenAnswer || "(Skipped)"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
 
            <div className="p-5 border-t border-[#dceae6] bg-[#f8fbf9] flex items-center justify-end">
              <button
                onClick={() => setViewingResult(null)}
                className="px-5 py-2.5 bg-[#007f70] hover:bg-[#00665a] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
 
      {reassessmentTarget && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4 font-sans text-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9]">
              <h3 className="text-sm font-bold text-[#071633]">Request Re-assessment</h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-[#607080] leading-relaxed">
                Are you sure you want to request a new assessment to complete at home? Once approved by the school, a completely new assessment with fresh questions will be assigned. Your previous attempt and score will remain in history.
              </p>
              <p className="text-[10px] font-bold text-amber-700 mt-3">Only one re-assessment is allowed per assessment.</p>
            </div>
            <div className="p-5 border-t border-[#dceae6] bg-[#f8fbf9] flex justify-end gap-3">
              <button onClick={() => setReassessmentTarget(null)} disabled={actionLoading} className="px-4 py-2 border border-[#dceae6] rounded-xl text-xs font-semibold text-[#607080]">Cancel</button>
              <button onClick={handleRequestReassessment} disabled={actionLoading} className="px-4 py-2 bg-[#007f70] text-white rounded-xl text-xs font-semibold disabled:opacity-50">
                {actionLoading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Pre-Assessment Security Notice Dialog */}
      {showSecurityNotice && pendingExamToStart && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4 font-sans text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#071633]">Assessment Security Instructions</h3>
              <p className="text-xs text-slate-500">Please review the required security regulations before commencing this examination.</p>
            </div>

            <div 
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}
              className="border p-4 rounded-2xl space-y-2.5 text-xs font-medium"
            >
              <p className="flex items-start gap-2">🟢 <span style={{ color: '#334155' }}>This assessment is <strong>AI monitored</strong>.</span></p>
              <p className="flex items-start gap-2">✔ <span style={{ color: '#334155' }}>Please remain <strong>fully visible</strong> in front of your camera throughout the exam.</span></p>
              <p className="flex items-start gap-2">✔ <span style={{ color: '#334155' }}><strong>Do not switch tabs</strong> or windows.</span></p>
              <p className="flex items-start gap-2">✔ <span style={{ color: '#334155' }}><strong>Do not minimize</strong> the browser window.</span></p>
              <p className="flex items-start gap-2">✔ <span style={{ color: '#334155' }}><strong>Do not exit full-screen</strong> mode once entered.</span></p>
              <p className="flex items-start gap-2">✔ <span style={{ color: '#334155' }}><strong>Do not use multiple screens</strong> or mirroring displays.</span></p>
              <p className="flex items-start gap-2">⚠ <span style={{ color: '#dc2626' }} className="font-bold">Your assessment will automatically submit if security rules are violated 3 times.</span></p>
              <p className="flex items-start gap-2">💾 <span style={{ color: '#334155' }}>Your answer selections and text inputs are saved automatically in the background.</span></p>
            </div>

            {cameraStatus === "blocked" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="font-extrabold">Camera & Microphone access is currently blocked</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Allow camera and microphone access from the site settings icon in the browser address bar, then retry. Fullscreen will begin only after both permissions are ready.
                </p>
                <button
                  type="button"
                  onClick={requestCameraAccess}
                  className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-extrabold text-amber-900 hover:bg-amber-100"
                >
                  Retry Camera & Mic Access
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  stopWebcam();
                  setShowSecurityNotice(false);
                  setPendingExamToStart(null);
                }}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStartExam}
                disabled={cameraStatus !== "ready" || actionLoading}
                className="flex-1 py-3 bg-[#007f70] hover:bg-[#00665a] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cameraStatus === "requesting" ? "Checking Camera..." : "Start Assessment"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen-safe submission confirmation */}
      {showSubmitConfirmation && takingExam && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/70 backdrop-blur-sm p-4 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-extrabold text-[#071633]">Submit Assessment?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Your answers will be finalized and cannot be changed after submission.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmation(false)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Continue Assessment
              </button>
              <button
                type="button"
                onClick={() => handleSubmitExam()}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-[#007f70] py-3 text-xs font-extrabold text-white hover:bg-[#00665a] disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Security Warning Overlay Modal */}
      {(!isFullScreenActive && takingExam && !isExitedViolation) && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-md p-4 font-sans select-none text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-6 text-center">
            <div className="security-warning-icon h-14 w-14 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-rose-600 uppercase tracking-wide">
                {warningsCount === 0 ? "⚠ Fullscreen Required" : warningsCount === 1 ? "⚠ Security Warning" : "⚠ Final Warning"}
              </h3>
              <p className="text-xs font-extrabold text-[#071633]">
                {warningsCount === 0 
                  ? "Assessment must be taken in Fullscreen Mode!"
                  : warningsCount === 1 
                    ? "You are attempting to leave the assessment window!" 
                    : "This is your final warning!"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {warningsCount === 0
                  ? "To proceed with this proctored assessment, you must enter and maintain a full-screen window environment. Please click the button below to start."
                  : warningsCount === 1
                    ? "Switching tabs, minimizing the browser, exiting full-screen, or losing window focus is strictly prohibited. This assessment is proctored. Another violation will automatically close your attempt and submit your answers."
                    : "Any further security violations (including tab changes, exiting fullscreen, or minimizing the browser) will immediately terminate your assessment attempt and submit your work."}
              </p>
            </div>

            <div 
              style={{ backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}
              className="border p-3.5 rounded-2xl flex items-center justify-between text-xs font-black"
            >
              <span>Security Warnings Recorded:</span>
              <span 
                style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                className="px-2.5 py-0.5 rounded-full font-mono"
              >
                {warningsCount} / 3
              </span>
            </div>

            <button
              type="button"
              onClick={handleResumeFullscreen}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-sm transition-all"
            >
              Return to Assessment (Re-Enter Fullscreen)
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Third Violation Terminated Modal */}
      {isExitedViolation && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/90 backdrop-blur-md p-4 font-sans select-none text-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-6 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <XCircle className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-red-600 uppercase tracking-wider">Assessment Ended</h3>
              <p className="text-xs font-bold text-[#071633]">Multiple security violations detected. Attempt Closed.</p>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Your assessment attempt has been automatically terminated and submitted to the school admissions committee because multiple security rule violations were logged.
              </p>
            </div>

            <div 
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}
              className="p-4 border rounded-2xl text-[11px] space-y-1.5 text-left font-medium"
            >
              <div className="flex justify-between">
                <span>Attempt Status:</span>
                <span style={{ color: '#dc2626' }} className="font-extrabold">Security Violation</span>
              </div>
              <div className="flex justify-between">
                <span>Total Warnings:</span>
                <span style={{ color: '#334155' }} className="font-extrabold">{warningsCount} / 3</span>
              </div>
              <div className="flex justify-between">
                <span>Auto-Saved Responses:</span>
                <span style={{ color: '#334155' }} className="font-extrabold">Submitted</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExitViolationScreen}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all"
            >
              Back to Online Assessments
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* At-School Slot Booking Modal */}
      {bookingAssessment && bookingData && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#071633]/60 backdrop-blur-sm p-4 font-sans text-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#dceae6] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-[#dceae6] bg-[#f8fbf9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#071633]">At-School Assessment Scheduling</h3>
                <p className="text-[10px] text-[#71818d] mt-0.5">Book or manage your candidate's test slot</p>
              </div>
              <button 
                onClick={() => {
                  setBookingAssessment(null);
                  setIsRescheduling(false);
                }}
                className="text-[#607080] hover:text-[#071633] font-bold text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Assessment Read-Only Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8fbf9] p-4 rounded-xl border border-[#cfe6e0]">
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Candidate</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.application?.studentFirstName} {bookingAssessment.application?.studentLastName}</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Assessment</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.title}</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Subject & Grade</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.subject} ({bookingAssessment.grade})</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Duration</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.timeLimit} mins</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Total Marks</span>
                  <span className="font-bold text-[#071633]">{bookingAssessment.totalMarks} pts</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Mode</span>
                  <span className="font-bold text-[#007f70]">At School</span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Assessment Date</span>
                  <span className="font-bold text-[#071633]">
                    {bookingData.schedule?.assessmentDate
                      ? new Date(bookingData.schedule.assessmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#71818d] block text-[9px] font-bold uppercase">Booking Closes</span>
                  <span className="font-bold text-[#b45309]">
                    {bookingData.slotBookingDeadline
                      ? new Date(bookingData.slotBookingDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
              </div>

              {bookingData.schedule ? (
                <>
                  {/* Venue & Contact & Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Venue Details</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px] text-[#071633]">
                          <p><strong>Campus:</strong> {bookingData.schedule.campus}</p>
                          <p><strong>Location:</strong> Room {bookingData.schedule.roomNumber}, Floor {bookingData.schedule.floor}, {bookingData.schedule.building}</p>
                          {bookingData.schedule.venue && <p><strong>Description:</strong> {bookingData.schedule.venue}</p>}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Contact Information</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-[11px] text-[#071633]">
                          <p><strong>Coordinator:</strong> {bookingData.schedule.contactPerson}</p>
                          <p><strong>Phone:</strong> {bookingData.schedule.contactPhone}</p>
                          <p><strong>Email:</strong> {bookingData.schedule.contactEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-xs text-[#071633] mb-1">Required Documents</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-[#071633]">
                          {bookingData.schedule.documentsRequired && bookingData.schedule.documentsRequired.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {bookingData.schedule.documentsRequired.map((doc: string) => (
                                <li key={doc}>{doc}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-500">No documents required.</p>
                          )}
                        </div>
                      </div>

                      {bookingData.schedule.instructions && (
                        <div>
                          <h4 className="font-bold text-xs text-[#071633] mb-1">Candidate Instructions</h4>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-[#607080] leading-relaxed max-h-24 overflow-y-auto">
                            {bookingData.schedule.instructions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slot Booking Section */}
                  <div className="border-t border-[#dceae6] pt-4 space-y-3">
                    <h4 className="font-bold text-xs text-[#071633]">Slot Assignment</h4>

                    {bookingData.currentBooking && !isRescheduling ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-emerald-800">Your Booked Slot</p>
                          <p className="text-[11px] text-[#071633] mt-1 font-semibold">
                            {bookingData.currentBooking.slot?.slotName} ({bookingData.currentBooking.slot?.startTime} - {bookingData.currentBooking.slot?.endTime})
                          </p>
                          <p className="text-[9px] text-[#71818d] mt-0.5">Booking Status: {bookingData.currentBooking.bookingStatus}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={handlePrintHallTicket}
                            className="bg-white border border-[#007f70] text-[#007f70] px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-[#eefaf7] transition-all"
                          >
                            Print Hall Ticket
                          </button>
                          {bookingData.schedule.allowStudentRescheduling && !bookingData.slotChangesLocked ? (
                            <>
                              <button
                                onClick={() => setIsRescheduling(true)}
                                className="bg-white border border-blue-600 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all"
                              >
                                Reschedule Slot
                              </button>
                              <button
                                onClick={() => handleCancelBooking(bookingData.currentBooking.id)}
                                className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
                              >
                                Cancel Booking
                              </button>
                            </>
                          ) : (
                            <p className="max-w-44 text-right text-[9px] font-semibold leading-4 text-[#607080]">
                              {bookingData.slotChangesLocked
                                ? `Slot changes closed on ${bookingData.slotBookingDeadline ? new Date(bookingData.slotBookingDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the booking deadline'}.`
                                : 'Slot changes are locked by the school. Contact the assessment coordinator for help.'}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {isRescheduling && (
                          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg text-blue-800 text-[10px] font-bold">
                            <span>Rescheduling Mode Active</span>
                            <button onClick={() => setIsRescheduling(false)} className="underline hover:text-blue-900">Back to current booking</button>
                          </div>
                        )}
                        <p className="text-[10px] text-[#71818d]">
                          {bookingData.slotChangesLocked
                            ? 'The slot booking deadline has passed. Contact the assessment coordinator for help.'
                            : 'Select one of the available time slots below:'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {bookingData.slots.map((slot: any) => {
                            const bookedCount = Number(slot.bookedCount) || 0;
                            const capacity = Number(slot.capacity) || 0;
                            const availablePlaces = Math.max(0, capacity - bookedCount);
                            const percent = capacity > 0 ? Math.min(100, Math.round((bookedCount / capacity) * 100)) : 100;
                            const isFull = percent >= 100;
                            const isSelected = bookingData.currentBooking?.slotId === slot.id;
                            
                            return (
                              <div 
                                key={slot.id} 
                                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                                  isSelected ? "border-[#007f70] bg-[#f0faf7] shadow-sm" : 
                                  isFull ? "border-slate-200 bg-slate-50 opacity-60" : "border-[#dceae6] bg-white hover:border-[#cfe6e0]"
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-start">
                                    <span className="font-bold text-[#071633] text-xs">{slot.slotName}</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${isFull ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
                                      {isFull ? "FULL" : `${availablePlaces} Available`}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#607080] mt-1 font-semibold">{slot.startTime} - {slot.endTime}</p>
                                  <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-[#dceae6] bg-[#f8fbfa] text-center">
                                    <div className="border-r border-[#dceae6] px-2 py-2">
                                      <span className="block text-[8px] font-bold uppercase tracking-wide text-[#71818d]">Capacity</span>
                                      <span className="mt-0.5 block text-xs font-extrabold text-[#071633]">{capacity}</span>
                                    </div>
                                    <div className="border-r border-[#dceae6] px-2 py-2">
                                      <span className="block text-[8px] font-bold uppercase tracking-wide text-[#71818d]">Booked</span>
                                      <span className="mt-0.5 block text-xs font-extrabold text-[#071633]">{bookedCount}</span>
                                    </div>
                                    <div className="px-2 py-2">
                                      <span className="block text-[8px] font-bold uppercase tracking-wide text-[#71818d]">Available</span>
                                      <span className="mt-0.5 block text-xs font-extrabold text-[#047857]">{availablePlaces}</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={bookingData.slotChangesLocked || availablePlaces <= 0 || isSelected || actionLoading}
                                  onClick={() => handleBookSlot(slot.id)}
                                  className={`w-full py-2 rounded-lg text-[10px] font-bold transition-all ${
                                    isSelected ? "bg-emerald-100 text-emerald-800 cursor-default" :
                                    bookingData.slotChangesLocked || isFull ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" :
                                    "bg-[#007f70] text-white hover:bg-[#00665a] shadow-xs"
                                  }`}
                                >
                                  {isSelected ? "Currently Booked" : bookingData.slotChangesLocked ? "Booking Closed" : isFull ? "Fully Booked" : "Book Slot"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                </>
              ) : (
                <div className="text-center py-10 bg-slate-50 border rounded-xl">
                  <p className="text-xs font-bold text-slate-500">The school has not published a scheduling venue or slots for this assessment yet.</p>
                </div>
              )}

            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
