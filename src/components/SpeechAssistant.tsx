import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, CheckCircle2, Volume2, Play, Pause, RefreshCw } from "lucide-react";

interface SpeechAssistantProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  value: string;
  questionText?: string;
  compact?: boolean;
  onStartRecording?: () => void;
}

export default function SpeechAssistant({ 
  onTranscript, 
  value, 
  compact = false, 
  onStartRecording 
}: SpeechAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Initialize browser speech recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US"; // Speaking questions are in English

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + " ";
          }
        }
        if (transcript) {
          onTranscriptRef.current(transcript.trim());
        }
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  // Handle countdown timer when recording
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isRecording) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(60);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    if (onStartRecording) {
      onStartRecording();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start media recorder
      const options = { mimeType: "audio/webm" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Start speech recognition
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          console.warn("Failed to start speech recognition (already run or iframe blocked):", e);
        }
      }

      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setPermissionError(
        "Could not access the microphone. Please make sure you grant microphone access permissions to your browser or check that it isn't blocked by iframe restrictions. You can still type your answers directly in the input box."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        // Safe catch
      }
    }
    setIsRecording(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Safe release of resources
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatSecs = (secs: number) => {
    return `00:${secs.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3" id="compact-recorder-container">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              id="listening-mic-toggle-btn"
              type="button"
              onClick={handleToggleRecording}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-2xs ${
                isRecording
                  ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff size={13} />
                  Parar ({formatSecs(timeLeft)})
                </>
              ) : (
                <>
                  <Mic size={13} />
                  Grabar Respuesta (1 min max)
                </>
              )}
            </button>

            {isRecording && (
              <span className="text-[11px] font-bold text-rose-600 animate-pulse font-mono uppercase">
                Grabando...
              </span>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
            Solo Grabación de Voz
          </div>
        </div>

        {permissionError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-[11px]">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">No se pudo acceder al micrófono. Por favor, asegúrate de otorgar los permisos de micrófono al navegador.</p>
          </div>
        )}

        {isRecording && (
          <div className="bg-white border border-rose-100 rounded-lg p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-end gap-1 h-4">
              <div className="w-0.5 bg-rose-500 rounded-t-xs animate-bounce" style={{ height: "40%", animationDelay: "0.1s" }}></div>
              <div className="w-0.5 bg-indigo-500 rounded-t-xs animate-bounce" style={{ height: "80%", animationDelay: "0.3s" }}></div>
              <div className="w-0.5 bg-purple-500 rounded-t-xs animate-bounce" style={{ height: "60%", animationDelay: "0.2s" }}></div>
              <div className="w-0.5 bg-amber-500 rounded-t-xs animate-bounce" style={{ height: "90%", animationDelay: "0.5s" }}></div>
              <div className="w-0.5 bg-rose-500 rounded-t-xs animate-bounce" style={{ height: "50%", animationDelay: "0.4s" }}></div>
            </div>
            <span className="text-[10px] font-mono text-rose-600 font-bold">{formatSecs(timeLeft)}</span>
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-lg text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span className="font-bold">¡Audio grabado con éxito! Escuchar grabación:</span>
            </div>
            <audio src={audioUrl} controls className="w-full h-8 rounded bg-emerald-100" />
          </div>
        )}

        {/* Read-only transcription box */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-left">
          <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Transcripción Automática Detectada</span>
            {value && <span className="text-emerald-600 font-sans">✓ Grabado</span>}
          </div>
          {value ? (
            <p className="text-xs text-slate-800 font-medium italic break-words leading-relaxed">
              "{value}"
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Sin respuesta de voz grabada en este momento. Haz clic en "Grabar Respuesta" para empezar.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4" id="simulated-recorder-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">VOICE AUDIO ASSISTANT (LIVE MICROPHONE)</span>
          <p className="text-xs text-slate-500">
            Record your actual response. We will listen and record your audio answer (maximum 1 minute).
          </p>
        </div>

        <button
          id="speaking-mic-toggle-btn"
          type="button"
          onClick={handleToggleRecording}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-md ${
            isRecording
              ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {isRecording ? (
            <>
              <MicOff size={15} />
              Stop Recording ({formatSecs(timeLeft)})
            </>
          ) : (
            <>
              <Mic size={15} />
              Start Voice Recording (1 min max)
            </>
          )}
        </button>
      </div>

      {permissionError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-800 text-xs shadow-3xs">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{permissionError}</p>
        </div>
      )}

      {isRecording && (
        <div className="bg-white border border-rose-100 rounded-lg p-4 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping"></span>
            <span className="text-xs font-bold text-rose-600 font-mono tracking-wide uppercase">REC &middot; Recording Live...</span>
          </div>

          <div className="flex items-end gap-1.5 h-6">
            <div className="w-1 bg-rose-500 rounded-t-xs animate-bounce" style={{ height: "40%", animationDelay: "0.1s" }}></div>
            <div className="w-1 bg-indigo-500 rounded-t-xs animate-bounce" style={{ height: "80%", animationDelay: "0.3s" }}></div>
            <div className="w-1 bg-purple-500 rounded-t-xs animate-bounce" style={{ height: "60%", animationDelay: "0.2s" }}></div>
            <div className="w-1 bg-amber-500 rounded-t-xs animate-bounce" style={{ height: "90%", animationDelay: "0.5s" }}></div>
            <div className="w-1 bg-rose-500 rounded-t-xs animate-bounce" style={{ height: "50%", animationDelay: "0.4s" }}></div>
            <div className="w-1 bg-emerald-500 rounded-t-xs animate-bounce" style={{ height: "70%", animationDelay: "0.1s" }}></div>
          </div>

          <div className="text-xs font-bold text-slate-700 font-mono">
            {formatSecs(timeLeft)} / 01:00
          </div>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold">Audio captured successfully!</span>
              <p className="text-[11px] text-emerald-700 opacity-90">
                You can play back your recorded response below:
              </p>
            </div>
          </div>
          
          <div className="pt-1.5">
            <audio src={audioUrl} controls className="w-full h-9 rounded bg-emerald-100" />
          </div>
        </div>
      )}
    </div>
  );
}
