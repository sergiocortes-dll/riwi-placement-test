export default function Instructions() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
        Important Instructions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 font-sans">
        <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
          <span className="font-bold text-slate-800 block mb-1">
            🎧 Interactive Listening
          </span>
          The system will utilize Text-to-Speech (TTS) to play the narrated
          transcripts. Please make sure your speakers/audio output is on.
        </div>
        <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
          <span className="font-bold text-slate-800 block mb-1">
            🎙️ Voice Speaking
          </span>
          You can dictate your spoken answers by tapping the microphone. The
          system will transcribe your speech in real-time.
        </div>
        <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-150">
          <span className="font-bold text-slate-800 block mb-1">
            🤖 AI Grading
          </span>
          Your open-ended answers, compositions, and speaking transcriptions
          will be graded in detail to determine official CEFR proficiency
          levels.
        </div>
      </div>
    </div>
  );
}
