import React, { useState, useEffect, useRef } from "react";
import StudentForm from "./components/StudentForm";
import ReviewTab from "./components/ReviewTab";
import SpeechAssistant from "./components/SpeechAssistant";
import AdminPanel from "./components/AdminPanel";
import { StudentInfo, TestAnswers, EvaluationResult, WritingTaskAnswer } from "./types";
import { getExamContent } from "./questions";
import { AlarmClock, Award, BookOpen, Volume2, Mic, FileText, Send, CheckCircle, ChevronRight, HelpCircle, GraduationCap, ArrowLeft, ArrowRight, Play, Pause, ChevronDown, Sparkles, ShieldAlert, Settings } from "lucide-react";

const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const globalSavedVersion = typeof window !== "undefined" ? localStorage.getItem("riwi_active_exam_version") : null;
const rawVersion = (params.get("version") || globalSavedVersion || "A").toUpperCase();
export const examVersion = ["A", "B", "C", "D"].includes(rawVersion) ? rawVersion : "A";
const storagePrefix = `riwi_v_${examVersion.toLowerCase()}_`;

const keys = {
  student: `${storagePrefix}student`,
  answers: `${storagePrefix}answers`,
  timer: `${storagePrefix}timer_v1`,
  grammarOrder: `${storagePrefix}grammar_order`,
  result: `${storagePrefix}result`,
  playCounts: `${storagePrefix}play_counts`,
};

const examContent = getExamContent(examVersion);
const { useOfEnglishQuestions, readingSections, listeningSections, writingTasks, speakingQuestions } = examContent;

const INITIAL_ANSWERS: TestAnswers = {
  useOfEnglish: {},
  reading: {
    openAnswers: {},
    mcqAnswers: {}
  },
  listening: {},
  writing: {
    task1: { optionSelected: 1, text: "" },
    task2: { optionSelected: 1, text: "" }
  },
  speaking: {}
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(() => {
    const saved = localStorage.getItem(keys.student);
    return saved ? JSON.parse(saved) : null;
  });

  const [answers, setAnswers] = useState<TestAnswers>(() => {
    const saved = localStorage.getItem(keys.answers);
    return saved ? JSON.parse(saved) : INITIAL_ANSWERS;
  });

  const [activeTab, setActiveTab] = useState<"use-of-english" | "reading" | "listening" | "writing" | "speaking">("use-of-english");
  const [readingIndex, setReadingIndex] = useState(0);
  const [listeningIndex, setListeningIndex] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState(0);

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const saved = localStorage.getItem(keys.timer);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return 5400; // 90 minutes
  });

  const [shuffledGrammarQuestions, setShuffledGrammarQuestions] = useState<typeof useOfEnglishQuestions>(() => {
    const savedOrder = localStorage.getItem(keys.grammarOrder);
    if (savedOrder) {
      try {
        const ids = JSON.parse(savedOrder) as string[];
        const ordered = ids
          .map((id) => useOfEnglishQuestions.find((q) => q.id === id))
          .filter(Boolean) as typeof useOfEnglishQuestions;
        if (ordered.length === useOfEnglishQuestions.length) {
          return ordered;
        }
      } catch (e) {
        console.error("Failed to restore grammar order:", e);
      }
    }
    return useOfEnglishQuestions;
  });

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(() => {
    const saved = localStorage.getItem(keys.result);
    return saved ? JSON.parse(saved) : null;
  });

  // State for cheating tab block
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    const savedStudent = localStorage.getItem(keys.student);
    if (savedStudent) {
      try {
        const info = JSON.parse(savedStudent);
        if (info && info.email) {
          const blockedMapStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
          if (blockedMapStr) {
            const blockedMap = JSON.parse(blockedMapStr);
            if (blockedMap[info.email.toLowerCase()]) {
              return true;
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return false;
  });

  // New states for custom modal dialogs to bypass browser sandboxed iframe restrictions (confirm/alert blocks)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string>("Notice");

  // Audio Player simulation state for listening
  const [audioPlayingId, setAudioPlayingId] = useState<number | null>(null);
  const [audioSpeechProgress, setAudioSpeechProgress] = useState(0);
  const [listeningPlayCounts, setListeningPlayCounts] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(keys.playCounts);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Admin panel state
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Auto-save progress
  useEffect(() => {
    localStorage.setItem(keys.playCounts, JSON.stringify(listeningPlayCounts));
  }, [listeningPlayCounts]);

  useEffect(() => {
    if (studentInfo) {
      localStorage.setItem(keys.student, JSON.stringify(studentInfo));
    } else {
      localStorage.removeItem(keys.student);
    }
  }, [studentInfo]);

  useEffect(() => {
    localStorage.setItem(keys.answers, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    if (evaluationResult) {
      localStorage.setItem(keys.result, JSON.stringify(evaluationResult));
    } else {
      localStorage.removeItem(keys.result);
    }
  }, [evaluationResult]);

  // Tab change / leave exam visibility detection tracker (Anti-cheat)
  useEffect(() => {
    if (!studentInfo || evaluationResult || isBlocked) return;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        // Violating tab policy!
        const emailToBlock = studentInfo.email.toLowerCase();
        
        // 1. Persist to blocked list
        const blockedMapStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
        const blockedMap = blockedMapStr ? JSON.parse(blockedMapStr) : {};
        blockedMap[emailToBlock] = {
          email: emailToBlock,
          name: studentInfo.name,
          blockedAt: new Date().toISOString(),
          reason: "Abrió otra pestaña o abandonó la ventana del examen"
        };
        localStorage.setItem("riwi_placement_blocked_emails_v1", JSON.stringify(blockedMap));
        
        // 2. Shut down exam timer and block current state
        setIsTimerRunning(false);
        setIsBlocked(true);

        // Cancel any pending text speech or simulation
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        } catch (e) {
          console.warn("Speech synthesis cancel failed during block:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [studentInfo, evaluationResult, isBlocked]);

  // Countdown timer clock
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && studentInfo && !evaluationResult && !isBlocked) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Time out! Auto submit!
            setIsTimerRunning(false);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, studentInfo, evaluationResult, isBlocked]);

  // Persist seconds left on change
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isBlocked) {
      localStorage.setItem(keys.timer, String(secondsLeft));
    }
  }, [secondsLeft, studentInfo, evaluationResult, isBlocked]);

  // If already logged in but timer wasn't running, run timer
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isTimerRunning && !isBlocked && secondsLeft > 0) {
      setIsTimerRunning(true);
    }
  }, [studentInfo, evaluationResult, isBlocked, secondsLeft]);

  // Auto-submit if timer is <= 0 on load or during exam
  useEffect(() => {
    if (studentInfo && !evaluationResult && !isBlocked && secondsLeft <= 0 && !isGrading) {
      handleSubmitTest();
    }
  }, [secondsLeft, studentInfo, evaluationResult, isBlocked, isGrading]);

  // General warm-up of Web Speech Synthesis on mount to resolve initial audio delay
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
          };
        }
        const warmUp = new SpeechSynthesisUtterance(" ");
        warmUp.volume = 0;
        warmUp.rate = 2;
        window.speechSynthesis.speak(warmUp);
      } catch (e) {
        console.warn("TTS preload warm up failed:", e);
      }
    }
  }, []);

  const handleStartExam = (info: StudentInfo) => {
    const blockedMapStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
    const blockedMap = blockedMapStr ? JSON.parse(blockedMapStr) : {};
    if (blockedMap[info.email.toLowerCase()]) {
      setIsBlocked(true);
      return;
    }
    setIsBlocked(false);
    setStudentInfo(info);
    
    // Randomize the Use of English questions for each student uniquely and persist the order
    const shuffled = shuffleArray(useOfEnglishQuestions);
    setShuffledGrammarQuestions(shuffled);
    localStorage.setItem(keys.grammarOrder, JSON.stringify(shuffled.map(q => q.id)));

    // Active warm-up of Speech Synthesis on start click
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.getVoices();
        const startWarmUp = new SpeechSynthesisUtterance("Welcome");
        startWarmUp.volume = 0;
        window.speechSynthesis.speak(startWarmUp);
      } catch (e) {}
    }

    setAnswers(INITIAL_ANSWERS);
    setSecondsLeft(5400);
    localStorage.setItem(keys.timer, "5400");
    setIsTimerRunning(true);
    setActiveTab("use-of-english");
  };

  const handleExitBlockedState = () => {
    setStudentInfo(null);
    setAnswers(INITIAL_ANSWERS);
    setEvaluationResult(null);
    setSecondsLeft(5400);
    setIsTimerRunning(false);
    setIsBlocked(false);
    localStorage.removeItem(keys.student);
    localStorage.removeItem(keys.answers);
    localStorage.removeItem(keys.result);
    localStorage.removeItem(keys.timer);
    localStorage.removeItem(keys.grammarOrder);
  };

  const handleUnlockEmail = (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const blockedStr = localStorage.getItem("riwi_placement_blocked_emails_v1");
    if (blockedStr) {
      try {
        const blockedMap = JSON.parse(blockedStr);
        if (blockedMap[emailLower]) {
          delete blockedMap[emailLower];
          localStorage.setItem("riwi_placement_blocked_emails_v1", JSON.stringify(blockedMap));
        }
      } catch (e) {
        console.error("Failed to parse/update blocked list:", e);
      }
    }
    if (studentInfo && studentInfo.email.toLowerCase() === emailLower) {
      setIsBlocked(false);
      setIsTimerRunning(true);
    }
  };

  const handleResetCooldown = (email: string) => {
    const emailLower = email.trim().toLowerCase();
    const attemptsStr = localStorage.getItem("riwi_placement_attempts_v1");
    if (attemptsStr) {
      try {
        const attemptsMap = JSON.parse(attemptsStr);
        if (attemptsMap[emailLower]) {
          delete attemptsMap[emailLower];
          localStorage.setItem("riwi_placement_attempts_v1", JSON.stringify(attemptsMap));
        }
      } catch (e) {
        console.error("Failed to parse/update attempts list:", e);
      }
    }
  };

  const handleResetExam = () => {
    setShowResetModal(true);
  };

  const confirmResetExam = () => {
    setStudentInfo(null);
    setAnswers(INITIAL_ANSWERS);
    setEvaluationResult(null);
    setSecondsLeft(5400);
    setIsTimerRunning(false);
    setListeningPlayCounts({});
    localStorage.clear();
    setShowResetModal(false);
  };

  const confirmSubmitTest = () => {
    setShowSubmitModal(false);
    handleSubmitTest();
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Speaks using Speech Synthesis for listening
  const handlePlayListeningAudio = (sectionIndex: number, text: string) => {
    try {
      if (audioPlayingId === sectionIndex) {
        // Pause/stop
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setAudioPlayingId(null);
        return;
      }

      const currentCount = listeningPlayCounts[sectionIndex] || 0;
      if (currentCount >= 3) {
        setErrorTitle("Límite de Reproducción Intercedido");
        setErrorMessage("Cada audio de la sección de Listening tiene permitido un límite máximo de 3 reproducciones. Has alcanzado el límite reglamentario.");
        return;
      }

      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setAudioPlayingId(sectionIndex);

      // Increment count
      setListeningPlayCounts(prev => ({
        ...prev,
        [sectionIndex]: currentCount + 1
      }));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85; // Natural speed for English tests

      utterance.onend = () => {
        setAudioPlayingId(null);
      };

      utterance.onerror = () => {
        setAudioPlayingId(null);
      };

      if (window.speechSynthesis) window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis failed or is blocked by iframe constraints:", e);
      setAudioPlayingId(null);
    }
  };

  // Speaks Examiner Speaking questions
  const handleSpeakerAssistantTTS = (questionText: string) => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      if (window.speechSynthesis) window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech Synthesis failed or is blocked by iframe constraints:", e);
    }
  };

  // Text answers modifier helpers
  const updateUseOfEnglish = (qId: string, value: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({
      ...prev,
      useOfEnglish: { ...prev.useOfEnglish, [qId]: value }
    }));
  };

  const updateReadingOpen = (qNumber: number, value: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({
      ...prev,
      reading: {
        ...prev.reading,
        openAnswers: { ...prev.reading.openAnswers, [String(qNumber)]: value }
      }
    }));
  };

  const updateReadingMCQ = (qId: string, value: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({
      ...prev,
      reading: {
        ...prev.reading,
        mcqAnswers: { ...prev.reading.mcqAnswers, [qId]: value }
      }
    }));
  };

  const updateListening = (qNumber: number, value: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({
      ...prev,
      listening: { ...prev.listening, [String(qNumber)]: value }
    }));
  };

  const updateWritingTask = (taskKey: "task1" | "task2", text: string, optionSelected?: number) => {
    if (secondsLeft <= 0) return;
    let validatedText = text;
    const maxLimit = taskKey === "task1" ? 120 : 200;
    
    const matches = Array.from(text.matchAll(/\S+/g));
    if (matches.length > maxLimit) {
      const lastAllowedWordMatch = matches[maxLimit - 1];
      const cutIndex = lastAllowedWordMatch.index! + lastAllowedWordMatch[0].length;
      validatedText = text.substring(0, cutIndex);
    }

    setAnswers((prev) => ({
      ...prev,
      writing: {
        ...prev.writing,
        [taskKey]: {
          optionSelected: optionSelected ?? prev.writing[taskKey].optionSelected,
          text: validatedText
        }
      }
    }));
  };

  const updateSpeaking = (qIndex: number, text: string) => {
    if (secondsLeft <= 0) return;
    setAnswers((prev) => ({
      ...prev,
      speaking: { ...prev.speaking, [String(qIndex + 1)]: text }
    }));
  };

  const getWordCount = (text: string) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Call the server api endpoint to review answers via Gemini
  const handleSubmitTest = async () => {
    setIsGrading(true);
    setGradingProgress("Analyzing Use of English multiple-choice answers...");
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn("Speech synthesis cancel failed inside submit handler:", e);
    }

    try {
      setTimeout(() => setGradingProgress("Evaluating Reading comprehension responses..."), 2000);
      setTimeout(() => setGradingProgress("Analyzing Listening transcripts..."), 4500);
      setTimeout(() => setGradingProgress("Reviewing Writing essays coherence, grammar, and CEFR level..."), 7000);
      setTimeout(() => setGradingProgress("Analyzing Speaking fluency and vocabulary depth..."), 9500);

      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          info: studentInfo,
          version: examVersion
        })
      });

      if (!response.ok) {
        throw new Error("The server failed during the grading process.");
      }

      const result: EvaluationResult = await response.json();
      setEvaluationResult(result);
      setIsTimerRunning(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("There was an error grading your answers. Please ensure you are connected to the internet and click submit again.");
    } finally {
      setIsGrading(false);
    }
  };

  // Render Student login if not signed up yet
  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <GraduationCap size={44} className="text-slate-900" />
          <StudentForm onStart={handleStartExam} currentVersion={examVersion} />
          
          <button
            onClick={() => setIsAdminOpen(true)}
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1 mt-4 font-sans font-bold uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-lg hover:shadow-2xs shadow-3xs"
          >
            <Settings size={13} />
            Acceso Administrador (Docentes)
          </button>
        </div>
        
        {isAdminOpen && (
          <AdminPanel 
            onClose={() => setIsAdminOpen(false)}
            onUnlockEmail={handleUnlockEmail}
            onResetCooldown={handleResetCooldown}
            currentVersion={examVersion}
          />
        )}
      </div>
    );
  }

  // Render Blocked screen if cheated/tab switched
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-xl space-y-8 animate-fade-in bg-slate-900 border border-red-950 p-8 md:p-12 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-60 h-60 bg-red-600 rounded-full opacity-10 blur-3xl"></div>
          
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mx-auto animate-pulse">
              <ShieldAlert size={36} />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-sans font-black tracking-tight text-white uppercase">
              EXAMEN BLOQUEADO
            </h2>
            
            <p className="text-xs font-mono text-red-400 uppercase tracking-widest">
              DETECCIÓN DE INFRACCIÓN DE SEGURIDAD
            </p>
          </div>

          <div className="space-y-4 text-left bg-slate-950/80 p-6 rounded-xl border border-red-900/10 text-slate-300 leading-relaxed text-sm font-sans">
            <p>
              El sistema ha detectado que has intentado <strong>abrir otra pestaña, cambiar de ventana, o abandonar la pantalla activa</strong> del examen.
            </p>
            <p>
              Para garantizar la transparencia, validez e imparcialidad del examen de ubicación de <strong>RIWI PLACEMENT TEST</strong>, queda estrictamente prohibida la navegación o pérdida de enfoque fuera del examen.
            </p>
            <p className="text-red-400 font-semibold bg-red-950/30 border border-red-950/50 rounded px-3 py-2.5 text-xs leading-relaxed">
              ⚠️ El correo electrónico <strong className="text-white">{studentInfo.email}</strong> ha sido inhabilitado de forma de permanente por incurrir en prácticas deshonestas. No se te permitirá continuar ni volver a presentar la prueba.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleExitBlockedState}
              className="px-6 py-3 bg-red-950 text-red-200 border border-red-900/50 hover:bg-red-900 text-xs font-semibold rounded-lg transition-all shadow-sm hover:shadow-red-900/10 cursor-pointer w-full sm:w-auto"
            >
              Registrar otro correo / Salir
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="px-6 py-3 bg-indigo-600 border border-indigo-505 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Settings size={14} />
              Desbloquear como Administrador (Docente)
            </button>
          </div>
        </div>

        {isAdminOpen && (
          <AdminPanel 
            onClose={() => setIsAdminOpen(false)}
            currentStudentEmail={studentInfo.email}
            onUnlockEmail={handleUnlockEmail}
            onResetCooldown={handleResetCooldown}
            currentVersion={examVersion}
          />
        )}
      </div>
    );
  }

  // Render Loader if Gemini is assessing
  if (isGrading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-md space-y-8 animate-fade-in">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <Sparkles size={32} className="text-indigo-400 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-sans font-black tracking-tight text-white uppercase">
              Grading Your Exam
            </h2>
            <p className="text-xs font-mono text-indigo-300 uppercase tracking-wider h-8">
              {gradingProgress}
            </p>
          </div>
          <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-400 leading-relaxed">
            Cambridge Cloud AI is analyzing your performance, reviewing your vocabulary, and preparing your personalized CEFR score proposal.
          </div>
        </div>
      </div>
    );
  }

  // Render Review/Report tab if already submitted successfully
  if (evaluationResult) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap size={20} className="text-indigo-600" />
              English Placement Test Results
            </h1>
            <button
              onClick={handleResetExam}
              className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              New Candidate
            </button>
          </div>
          <ReviewTab result={evaluationResult} onReset={handleResetExam} />
        </div>

        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                  <HelpCircle size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-sans font-bold text-slate-900 text-left">
                    Restart Your Exam?
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans text-left">
                    This will completely clear your current answers, student credentials, and graded placement results from this device. Are you sure you want to continue?
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetExam}
                  className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
                >
                  Yes, Clear & Restart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800 flex flex-col">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 tracking-tight leading-none text-xl">
                English Placement Test
              </h1>
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mt-1.5">
                ACTIVE EXAM &middot; <span className="text-slate-800 font-extrabold">{studentInfo.name} ({studentInfo.email})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-6">
            
            {/* Countdown timer widget */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 font-mono font-bold text-xs">
              <AlarmClock size={15} className="animate-pulse" />
              <span>{formatTimer(secondsLeft)} remaining</span>
            </div>

            {/* Quick Finish button */}
            <button
              id="submit-test-button"
              onClick={() => {
                setShowSubmitModal(true);
              }}
              className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-97 flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              Submit Exam
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:grid md:grid-cols-12 gap-8">
        
        {/* Step-by-Step Lateral Sidebar Navigation (Now Sticky) */}
        <nav className="md:col-span-3 space-y-2 mb-6 md:mb-0 md:sticky md:top-24 self-start">
          <h3 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-3 mb-3 block">TEST SECTIONS</h3>
          
          <button
            onClick={() => setActiveTab("use-of-english")}
            className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
              activeTab === "use-of-english"
                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                activeTab === "use-of-english" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
              }`}>1</span>
              Part 1 — Use of English
            </span>
            <ChevronRight size={14} className={activeTab === "use-of-english" ? "text-indigo-200" : "text-slate-400"} />
          </button>

          <button
            onClick={() => setActiveTab("reading")}
            className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
              activeTab === "reading"
                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                activeTab === "reading" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
              }`}>2</span>
              Part 2 — Reading
            </span>
            <ChevronRight size={14} className={activeTab === "reading" ? "text-indigo-200" : "text-slate-400"} />
          </button>

          <button
            onClick={() => setActiveTab("listening")}
            className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
              activeTab === "listening"
                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                activeTab === "listening" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
              }`}>3</span>
              Part 3 — Listening
            </span>
            <ChevronRight size={14} className={activeTab === "listening" ? "text-indigo-200" : "text-slate-400"} />
          </button>

          <button
            onClick={() => setActiveTab("writing")}
            className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
              activeTab === "writing"
                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                activeTab === "writing" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
              }`}>4</span>
              Part 4 — Writing
            </span>
            <ChevronRight size={14} className={activeTab === "writing" ? "text-indigo-200" : "text-slate-400"} />
          </button>

          <button
            onClick={() => setActiveTab("speaking")}
            className={`w-full text-left p-3.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer border ${
              activeTab === "speaking"
                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] ${
                activeTab === "speaking" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
              }`}>5</span>
              Part 5 — Speaking
            </span>
            <ChevronRight size={14} className={activeTab === "speaking" ? "text-indigo-200" : "text-slate-400"} />
          </button>

          {/* Guidelines info */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mt-6 text-xs text-slate-500 leading-relaxed font-sans space-y-2">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resumen de Progreso</div>
            <div>
              <strong>U. English:</strong> {Object.keys(answers.useOfEnglish).length}/20 resp.
            </div>
            <div>
              <strong>Reading:</strong> {Object.keys(answers.reading.openAnswers).length + Object.keys(answers.reading.mcqAnswers).length}/15 resp.
            </div>
            <div>
              <strong>Listening:</strong> {Object.keys(answers.listening).length}/20 resp.
            </div>
            <div>
              <strong>Writing:</strong> {answers.writing.task1.text.trim() ? "T1 ✅" : "T1 ❌"} &middot; {answers.writing.task2.text.trim() ? "T2 ✅" : "T2 ❌"}
            </div>
            <div>
              <strong>Speaking:</strong> {Object.keys(answers.speaking).length}/20 resp.
            </div>
          </div>

          {/* Admin override button for evaluators */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="w-full mt-4 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-98"
          >
            <Settings size={13} />
            Panel de Docente (Admin)
          </button>
        </nav>

        {/* Dynamic Display Area */}
        <main className="md:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-lg">
          
          {/* TAB 1: Use Of English */}
          {activeTab === "use-of-english" && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">PART 1 &middot; GRAMMAR</span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2">
                  Use of English
                </h2>
                <p className="text-slate-500 text-xs mt-1 font-sans">
                  Choose the best answer for each of the following 20 questions.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-slate-100 max-h-2xl overflow-y-auto pr-2">
                {shuffledGrammarQuestions.map((q, idx) => (
                  <div key={q.id} className={`space-y-3 ${idx > 0 ? "pt-5" : ""}`}>
                    <h4 className="text-slate-800 font-bold text-sm">
                      {idx + 1}. {q.question}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => {
                        const isSelected = answers.useOfEnglish[String(q.number)] === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => updateUseOfEnglish(String(q.number), opt.key)}
                            className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs transition-all text-left cursor-pointer border ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                            }`}
                          >
                            <span>
                              <strong className="mr-1.5 uppercase">{opt.key})</strong> {opt.text}
                            </span>
                            {isSelected && <CheckCircle size={14} className="text-indigo-200 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Nav actions */}
              <div className="border-t border-slate-100 pt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("reading")}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-97"
                >
                  Continuar Reading
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Reading Section */}
          {activeTab === "reading" && (
            <div className="flex-1 flex flex-col md:grid md:grid-cols-2">
              
              {/* Left Column: Passage Display (Prevention of copy/paste included) */}
              <div className="p-6 md:p-8 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto max-h-2xl space-y-4 select-none animate-fade-in" onCopy={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs mb-3">
                  <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider">READING PASSAGES</span>
                  <div className="flex gap-1.5">
                    {readingSections.map((sect, i) => (
                      <button
                        key={i}
                        onClick={() => setReadingIndex(i)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase cursor-pointer transition-all ${
                          readingIndex === i
                            ? "bg-indigo-600 text-white border border-indigo-600 shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                        }`}
                      >
                        Passage {i + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 bg-white p-5 rounded-lg border border-slate-200 shadow-xs user-select-none">
                  <h3 className="font-display font-bold text-base text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600" />
                    {readingSections[readingIndex].title}
                  </h3>
                  <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-sans max-h-md overflow-y-auto pr-1">
                    {readingSections[readingIndex].text}
                  </div>
                </div>
              </div>

              {/* Right Column: Questions List */}
              <div className="p-6 md:p-8 overflow-y-auto max-h-2xl space-y-6 flex flex-col justify-between">
                <div>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">PART 2 &middot; READ COMPREHENSION</span>
                  <h2 className="text-lg font-display font-bold text-slate-900 mt-2 mb-4">
                    Answer the Comprehension Questions
                  </h2>

                  {/* Open Ended questions */}
                  <div className="space-y-5 divide-y divide-slate-150">
                    {readingSections[readingIndex].openQuestions.map((q, idx) => (
                      <div key={q.number} className={`space-y-2 ${idx > 0 ? "pt-4" : ""}`}>
                        <label className="block text-slate-800 text-xs font-semibold leading-relaxed">
                          {q.number}. {q.question}
                        </label>
                        <textarea
                          placeholder="Type your answer in English here..."
                          rows={2}
                          value={answers.reading.openAnswers[String(q.number)] || ""}
                          onChange={(e) => updateReadingOpen(q.number, e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 font-sans leading-relaxed transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Multiple Choice related to reading (Only in Remote Work readingSection[1]) */}
                  {readingSections[readingIndex].mcqQuestions && (
                    <div className="space-y-6 pt-5 mt-5 border-t border-slate-200">
                      <h3 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Vocabulary & Reading Multiple Choice:
                      </h3>
                      <div className="space-y-5 divide-y divide-slate-150">
                        {readingSections[readingIndex].mcqQuestions?.map((q) => (
                          <div key={q.id} className="space-y-3 pt-4">
                            <h4 className="text-slate-800 font-bold text-xs">
                              {q.number}. {q.question}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt) => {
                                const isSelected = answers.reading.mcqAnswers[String(q.number)] === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    onClick={() => updateReadingMCQ(String(q.number), opt.key)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all text-left cursor-pointer border ${
                                      isSelected
                                        ? "bg-indigo-600 text-white font-semibold border-indigo-600 shadow-xs"
                                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                  >
                                    <span>
                                      <strong className="mr-1.5 uppercase">{opt.key})</strong> {opt.text}
                                    </span>
                                    {isSelected && <CheckCircle size={12} className="text-indigo-200 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation actions */}
                <div className="border-t border-slate-100 pt-5 mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (readingIndex > 0) {
                          setReadingIndex(readingIndex - 1);
                        } else {
                          setActiveTab("use-of-english");
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg shadow-2xs transition-all active:scale-97 cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      {readingIndex > 0 ? `Prev Passage (Passage ${readingIndex})` : "Back to Grammar"}
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {readingIndex < readingSections.length - 1 ? (
                      <button
                        onClick={() => {
                          setReadingIndex(readingIndex + 1);
                        }}
                        className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-97 cursor-pointer"
                      >
                        Next Passage (Passage {readingIndex + 2})
                        <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab("listening")}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-97 cursor-pointer"
                      >
                        Continue to Listening (Next Tab)
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: Listening Section */}
          {activeTab === "listening" && (
            <div className="p-6 md:p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">PART 3 &middot; LISTENING COMPREHENSION</span>
                  <h2 className="text-xl font-display font-bold text-slate-900 mt-2">
                    Listening Assessment
                  </h2>
                  <p className="text-slate-500 text-xs mt-1">
                    Play the interactive audios and write your answers to the corresponding questions clearly in English.
                  </p>
                </div>
                
                {/* Audio sections buttons */}
                <div className="flex flex-wrap gap-1.5 self-start">
                  {listeningSections.map((sect, i) => (
                    <button
                      key={i}
                      onClick={() => setListeningIndex(i)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        listeningIndex === i
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      Audio {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animated Player Module */}
              <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-5 justify-between relative overflow-hidden text-white shadow-sm">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>
                
                <div className="flex items-center gap-4 text-left">
                  <button
                    onClick={() => handlePlayListeningAudio(listeningIndex, listeningSections[listeningIndex].transcript)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                      audioPlayingId === listeningIndex
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                        : (listeningPlayCounts[listeningIndex] || 0) >= 3
                          ? "bg-slate-800 text-rose-400 hover:bg-slate-800/80 border border-slate-700/60"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/40"
                    }`}
                  >
                    {audioPlayingId === listeningIndex ? <Pause size={24} /> : <Play size={24} className="relative left-0.5" />}
                  </button>
 
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] font-mono tracking-widest text-slate-400 block uppercase font-bold">
                      Official Exam Audio Player
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm font-sans">
                      {listeningSections[listeningIndex].title}
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {audioPlayingId === listeningIndex ? "Playing audio track..." : (listeningPlayCounts[listeningIndex] || 0) >= 3 ? "Límite alcanzado (No more attempts)" : "Ready to play (Native accent instructor voice)"}
                    </p>
                    
                    {/* Play count indicators with dots */}
                    <div className="flex items-center gap-2 mt-1.5 bg-slate-950/45 py-1 px-2.5 rounded-md border border-slate-800 w-fit">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reproducciones:</span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((num) => {
                          const currentCount = listeningPlayCounts[listeningIndex] || 0;
                          const isUsed = currentCount >= num;
                          return (
                            <div
                              key={num}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                isUsed
                                  ? currentCount === 3
                                    ? "bg-rose-500 shadow-xs shadow-rose-900/50 animate-pulse"
                                    : "bg-indigo-400 shadow-xs shadow-indigo-950/50"
                                  : "bg-slate-755 bg-slate-700"
                              }`}
                              title={`Reproducción ${num}`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[10px] font-bold font-mono ml-1 text-slate-300 leading-none">
                        {listeningPlayCounts[listeningIndex] || 0}/3
                      </span>
                    </div>
                  </div>
                </div>
 
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Volume2 size={24} className={`text-indigo-400 ${audioPlayingId === listeningIndex ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] text-indigo-300 font-mono">English Language Model</span>
                </div>
              </div>
 
              {/* Listening question items */}
              <div className="space-y-5">
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Questions to answer for Audio {listeningIndex + 1}:
                </h3>
                <div className="space-y-4 divide-y divide-slate-150 max-h-lg overflow-y-auto pr-1">
                  {listeningSections[listeningIndex].questions.map((q, idx) => (
                    <div key={q.number} className={`space-y-2.5 ${idx > 0 ? "pt-4" : ""}`}>
                      <label className="block text-slate-800 text-xs font-semibold">
                        {q.number}. {q.question}
                      </label>
                      <input
                        type="text"
                        placeholder="Write your answer in English here..."
                        value={answers.listening[String(q.number)] || ""}
                        onChange={(e) => updateListening(q.number, e.target.value)}
                        className="w-full px-3.5 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 font-sans transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation actions */}
              <div className="border-t border-slate-100 pt-5 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (listeningIndex > 0) {
                        setListeningIndex(listeningIndex - 1);
                      } else {
                        setActiveTab("reading");
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg shadow-2xs transition-all active:scale-97 cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    {listeningIndex > 0 ? `Prev Audio (Audio ${listeningIndex})` : "Back to Reading"}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {listeningIndex < listeningSections.length - 1 ? (
                    <button
                      onClick={() => {
                        setListeningIndex(listeningIndex + 1);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-97 cursor-pointer"
                    >
                      Next Audio (Audio {listeningIndex + 2})
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab("writing")}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-97 cursor-pointer"
                    >
                      Continue to Writing (Next Tab)
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: Writing Section */}
          {activeTab === "writing" && (
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="border-b border-slate-200 pb-4">
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">PART 4 &middot; WRITTEN COMPOSITIONS</span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2">
                  Writing Section
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Review the prompts and write compositions within the recommended word counts. Choose one option per task.
                </p>
              </div>

              <div className="space-y-8 divide-y divide-slate-150">
                
                {/* Task 1 */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText size={15} className="text-indigo-600" />
                      Task 1 (Recommended range: 80 - 120 words)
                    </h3>
                    <div className="text-xs text-slate-500">
                      Word count:{" "}
                      <span className={`font-bold ${
                        getWordCount(answers.writing.task1.text) >= 80 && getWordCount(answers.writing.task1.text) <= 120
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        {getWordCount(answers.writing.task1.text)}
                      </span>{" "}
                      words
                    </div>
                  </div>

                  {/* Task Topics selection checkboxes */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest block">Choose ONE of the three options below:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {writingTasks[0].topics.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateWritingTask("task1", answers.writing.task1.text, t.id)}
                          className={`p-3.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            answers.writing.task1.optionSelected === t.id
                              ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <span className="block font-mono text-[9px] uppercase tracking-wider mb-1 opacity-70">Option {t.id}</span>
                          {t.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={answers.writing.task1.text}
                    onChange={(e) => updateWritingTask("task1", e.target.value)}
                    placeholder="Write your composition in English here..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 font-sans leading-relaxed transition-all"
                  />
                </div>

                {/* Task 2 */}
                <div className="space-y-4 pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <FileText size={15} className="text-indigo-600" />
                      Task 2 (Recommended range: 150 - 200 words)
                    </h3>
                    <div className="text-xs text-slate-500">
                      Word count:{" "}
                      <span className={`font-bold ${
                        getWordCount(answers.writing.task2.text) >= 150 && getWordCount(answers.writing.task2.text) <= 200
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}>
                        {getWordCount(answers.writing.task2.text)}
                      </span>{" "}
                      words
                    </div>
                  </div>

                  {/* Task Topics selection checkboxes */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-widest block">Choose ONE of the three options below:</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {writingTasks[1].topics.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateWritingTask("task2", answers.writing.task2.text, t.id)}
                          className={`p-3.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            answers.writing.task2.optionSelected === t.id
                              ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <span className="block font-mono text-[9px] uppercase tracking-wider mb-1 opacity-70">Option {t.id}</span>
                          {t.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={answers.writing.task2.text}
                    onChange={(e) => updateWritingTask("task2", e.target.value)}
                    placeholder="Write your composition in English here..."
                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 font-sans leading-relaxed transition-all"
                  />
                </div>

              </div>

              {/* Navigation actions */}
              <div className="border-t border-slate-100 pt-5 mt-6 flex justify-between items-center">
                <button
                  onClick={() => setActiveTab("listening")}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Regresar
                </button>
                <button
                  onClick={() => setActiveTab("speaking")}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-97"
                >
                  Continuar Speaking
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>
          )}

          {/* TAB 5: Speaking Section */}
          {activeTab === "speaking" && (
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="border-b border-slate-200 pb-4">
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">PART 5 &middot; ORAL EXPRESSION PRACTICE</span>
                <h2 className="text-xl font-display font-bold text-slate-900 mt-2">
                  Speaking Examiner
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Escucha las preguntas leídas por el examinador y graba tu respuesta de voz en inglés. Nota: Se permite grabar la respuesta, pero la opción de escribir ha sido inhabilitada.
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Upper Examiner Section */}
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg relative overflow-hidden text-slate-950 shadow-3xs flex flex-col md:flex-row items-center gap-6 justify-between">
                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider">Oral Interview Question</span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug font-sans">
                      "{speakingQuestions[speakingIndex]}"
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2.5 shrink-0 justify-center">
                    <button
                      type="button"
                      onClick={() => handleSpeakerAssistantTTS(speakingQuestions[speakingIndex])}
                      className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Volume2 size={13} />
                      Examiner Read
                    </button>
                    
                    {/* Choose next speaking index dropdown select */}
                    <div className="relative">
                      <select
                        value={speakingIndex}
                        onChange={(e) => setSpeakingIndex(Number(e.target.value))}
                        className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-800 px-4.5 py-2.5 pr-9 rounded-lg text-xs outline-none font-bold transition-all cursor-pointer"
                      >
                        {speakingQuestions.map((q, i) => (
                          <option key={i} value={i}>Question {i + 1}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Microphone / dictated Text area responses */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Candidate Response (Solo Audio-Grabable)</span>
                  
                  <textarea
                    rows={5}
                    readOnly
                    value={answers.speaking[String(speakingIndex + 1)] || ""}
                    placeholder="La escritura manual está inhabilitada. Por favor utiliza la grabadora de voz de abajo para plasmar tu respuesta en inglés..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none text-slate-500 placeholder-slate-400 font-sans leading-relaxed cursor-not-allowed"
                  />

                  {/* Speech Dictator button helper widget */}
                  <div className="p-1">
                    <SpeechAssistant
                      value={answers.speaking[String(speakingIndex + 1)] || ""}
                      questionText={speakingQuestions[speakingIndex]}
                      onTranscript={(text) => {
                        const current = answers.speaking[String(speakingIndex + 1)] || "";
                        updateSpeaking(speakingIndex, current + (current ? " " : "") + text);
                      }}
                      placeholder="Speak slowly with your mic..."
                    />
                  </div>
                </div>

                {/* Bottom step page review indicator */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="text-xs text-slate-400 font-mono">
                    Question {speakingIndex + 1} of {speakingQuestions.length}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={speakingIndex === 0}
                      onClick={() => setSpeakingIndex(prev => prev - 1)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        speakingIndex === 0
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={speakingIndex === speakingQuestions.length - 1}
                      onClick={() => setSpeakingIndex(prev => prev + 1)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        speakingIndex === speakingQuestions.length - 1
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 cursor-pointer"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>

              </div>

              {/* Navigation actions */}
              <div className="border-t border-slate-200 pt-5 mt-8 flex justify-between items-center">
                <button
                  onClick={() => setActiveTab("writing")}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(true);
                  }}
                  className="px-6 py-3 bg-emerald-600 border border-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-emerald-700 hover:border-emerald-700 cursor-pointer tracking-wide shadow-xs transition-all active:scale-97"
                >
                  <Award size={15} />
                  Submit and Complete Exam
                </button>
              </div>

            </div>
          )}

        </main>

      </div>

      {/* Custom Confirmation/Error modally overlays to bypass iframe dialog restrictions */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <Send size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-sans font-bold text-slate-900 text-left">
                  Submit Assessment
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans text-left">
                  Are you sure you want to grade and complete your English Placement Test? 
                  Your solutions across all sections will be evaluated. This action is final and your scores will be calculated immediately.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel, Keep Answering
              </button>
              <button
                onClick={confirmSubmitTest}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
              >
                Yes, Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-sans font-bold text-slate-900 text-left">
                  Restart Your Exam?
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans text-left">
                  This will completely clear your current answers, student credentials, and graded placement results from this device. Are you sure you want to continue?
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmResetExam}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
              >
                Yes, Clear & Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 space-y-3">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-center text-rose-600">
                <Sparkles size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-sans font-bold text-slate-900 text-left">
                  {errorTitle}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans text-left">
                  {errorMessage}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdminOpen && (
        <AdminPanel 
          onClose={() => setIsAdminOpen(false)}
          currentStudentEmail={studentInfo.email}
          onUnlockEmail={handleUnlockEmail}
          onResetCooldown={handleResetCooldown}
          currentVersion={examVersion}
        />
      )}

    </div>
  );
}
