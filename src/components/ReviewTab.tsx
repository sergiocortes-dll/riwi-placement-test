import React, { useRef, useState } from "react";
import { EvaluationResult } from "../types";
import { useOfEnglishQuestions, readingSections, listeningSections } from "../questions";
import { Award, Printer, RefreshCw, CheckCircle2, ChevronRight, HelpCircle, BookOpen, Clock, Phone, FileText } from "lucide-react";

interface ReviewTabProps {
  result: EvaluationResult;
  onReset: () => void;
}

export default function ReviewTab({ result, onReset }: ReviewTabProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"certificate" | "analysis">("certificate");

  const handlePrint = () => {
    window.print();
  };

  // Safe percentages
  const getPercentageColor = (pct: number) => {
    if (pct >= 85) return "text-emerald-500 border-emerald-500 bg-emerald-50";
    if (pct >= 60) return "text-indigo-500 border-indigo-500 bg-indigo-50";
    if (pct >= 40) return "text-amber-500 border-amber-500 bg-amber-50";
    return "text-rose-500 border-rose-500 bg-rose-50";
  };

  // Convert scores to 0-100 scale matching standard EF SET scores
  const rScoreRaw = result.scores.readingMcq.score + result.scores.readingOpen.score;
  const rScore100 = Math.round((rScoreRaw / 20) * 100);

  const lScoreRaw = result.scores.listening.score;
  const lScore100 = Math.round((lScoreRaw / 25) * 100);

  const wScoreRaw = result.scores.writing.task1.score + result.scores.writing.task2.score;
  const wScore100 = Math.round((wScoreRaw / 30) * 100);

  const sScoreRaw = result.scores.speaking.score;
  const sScore100 = Math.round((sScoreRaw / 20) * 100);

  // EF SET Score is the standard average of the skill scores
  const overallEFSET = Math.round((rScore100 + lScore100 + wScore100 + sScore100) / 4);

  // Fallback and dynamic RIWI bands mappings
  const riwiBands = result.riwiBands || (() => {
    const getBand = (pct: number) => {
      if (pct >= 95) return 9.0;
      if (pct >= 89) return 8.5;
      if (pct >= 81) return 8.0;
      if (pct >= 73) return 7.5;
      if (pct >= 65) return 7.0;
      if (pct >= 57) return 6.5;
      if (pct >= 49) return 6.0;
      if (pct >= 41) return 5.5;
      if (pct >= 33) return 5.0;
      if (pct >= 25) return 4.5;
      if (pct >= 17) return 4.0;
      if (pct >= 10) return 3.5;
      return 3.0;
    };
    const rBand = getBand(rScore100);
    const lBand = getBand(lScore100);
    const wBand = getBand(wScore100);
    const sBand = getBand(sScore100);
    const rawAvg = (rBand + lBand + wBand + sBand) / 4;
    const ovr = Math.round(rawAvg * 2) / 2;
    return {
      reading: rBand,
      listening: lBand,
      writing: wBand,
      speaking: sBand,
      overall: ovr
    };
  })();

  // Helper mapping score (0-100) to EF SET CEFR level descriptors
  const getCEFRFromScore = (score: number) => {
    if (score <= 20) return { code: "A0", name: "Novice" };
    if (score <= 30) return { code: "A1", name: "Beginner" };
    if (score <= 40) return { code: "A2", name: "Elementary" };
    if (score <= 50) return { code: "B1", name: "Intermediate" };
    if (score <= 60) return { code: "B2", name: "Upper Intermediate" };
    if (score <= 70) return { code: "C1", name: "Advanced" };
    return { code: "C2", name: "Proficient" };
  };

  const activeOverall = getCEFRFromScore(overallEFSET);
  const rLevel = getCEFRFromScore(rScore100);
  const lLevel = getCEFRFromScore(lScore100);
  const wLevel = getCEFRFromScore(wScore100);
  const sLevel = getCEFRFromScore(sScore100);

  // EF SET comparison columns data matching RIWI equivalent bands
  const comparisonColumns = [
    { range: "0-20", mcer: "A0", level: "Novice", band: "1.0 - 2.0" },
    { range: "21-30", mcer: "A1", level: "Beginner", band: "2.5 - 3.0" },
    { range: "31-40", mcer: "A2", level: "Elementary", band: "3.5 - 4.0" },
    { range: "41-50", mcer: "B1", level: "Intermediate", band: "4.5 - 5.0" },
    { range: "51-60", mcer: "B2", level: "Upper Intermediate", band: "5.5 - 6.5" },
    { range: "61-70", mcer: "C1", level: "Advanced", band: "7.0 - 8.0" },
    { range: "71-100", mcer: "C2", level: "Proficient", band: "8.5 - 9.0" }
  ];

  const activeColumnIndex = (() => {
    if (overallEFSET <= 20) return 0;
    if (overallEFSET <= 30) return 1;
    if (overallEFSET <= 40) return 2;
    if (overallEFSET <= 50) return 3;
    if (overallEFSET <= 60) return 4;
    if (overallEFSET <= 70) return 5;
    return 6;
  })();

  const getCEFRDescriptionDetail = (cefr: string) => {
    switch (cefr.toUpperCase()) {
      case "C2":
        return "Mastery Level (C2): Demonstrates flawless comprehension of all structured or technical texts, speaks with absolute fluency, and produces writing with outstanding idiomatic precision.";
      case "C1":
        return "Advanced Level (C1): Fluent and natural ability to write well-organized complex texts, sustain precise logical arguments, and extract critical nuances in listening and reading comprehension.";
      case "B2":
        return "Upper Intermediate Level (B2): Capable of communicating with sufficient fluency and naturalness, arguing viewpoints with solid composition structure, and understanding standard technical descriptions in your discipline.";
      case "B1":
        return "Intermediate Level (B1): Clear understanding of the main points on standard matters regularly encountered in work, school, or leisure. Able to write simple connected text and describe experiences.";
      case "A2":
        return "Elementary Level (A2): Capable of engaging in short dialogues, grabbing very frequent phrases/statements, and writing simple sentences with basic grammatical structures.";
      case "A1":
      default:
        return "Beginner Level (A1): Recognizes familiar everyday words, answers extremely basic yes/no or single-word questions, and writes very short lines with limited vocabulary.";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto my-8 print:p-0" id="placement-review-wrapper">
      
      {/* Control Actions (No print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab("certificate")}
            className={`px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "certificate"
                ? "bg-white text-slate-900 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            RIWI Placement Test Certificate
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-3.5 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === "analysis"
                ? "bg-white text-slate-900 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Answers Analysis & AI
          </button>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            id="print-report-button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-97 cursor-pointer"
          >
            <Printer size={13} />
            Print Certificate PDF
          </button>
          <button
            id="reset-test-button"
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-97 cursor-pointer"
          >
            <RefreshCw size={13} />
            Reset Test
          </button>
        </div>
      </div>

      {/* VIEW 1: PREMIUM EF SET STATEMENT OF RESULTS (CERTIFICATE) */}
      <div 
        ref={printRef} 
        className={`${activeTab === "certificate" ? "block" : "hidden print:block"} bg-white rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden font-sans pb-12 print:border-none print:shadow-none print:p-0`}
        id="efset-certificate-sheet"
      >
        {/* Top brand header */}
        <div className="p-8 md:p-12 text-center flex flex-col items-center">
          {/* RIWI Brand logo */}
          <div className="text-3xl tracking-wide font-display font-black mb-4 text-[#0c2e55]" id="efset-brand-logo">
            <span className="font-extrabold text-indigo-600">RIWI</span> <span className="font-light text-slate-500">PLACEMENT TEST</span>
          </div>

          {/* Badge: English Certification */}
          <div className="inline-block bg-[#e21a8c] text-white text-[13px] font-bold px-6 py-1.5 rounded-full uppercase tracking-wider mb-8 shadow-2xs">
            English Certification
          </div>

          {/* Student name */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#0d1727] tracking-tight max-w-xl line-clamp-2 leading-tight">
            {result.studentInfo.name || "Maria Alejandra Camargo"}
          </h1>

          {/* Subtitle */}
          <p className="text-slate-500 text-sm md:text-base font-normal mt-5 max-w-md">
            has successfully completed the RIWI PLACEMENT TEST and has attained the level:
          </p>

          {/* Star/Diamond burst mandala container */}
          <div className="relative my-14 w-80 h-80 flex items-center justify-center" id="mandala-container">
            {/* Elegant multi-layered rotated square design creating star motif */}
            {[0, 15, 30, 45, 60, 75].map((rotation, idx) => (
              <div
                key={idx}
                className="absolute inset-2 border border-[#e21a8c]/15 rounded-2.5xl bg-gradient-to-tr from-[#e21a8c]/4 via-indigo-500/2 to-purple-600/4 transition-transform duration-500"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ))}

            {/* Dash ring inside */}
            <div className="absolute w-64 h-64 rounded-full border border-dashed border-[#e21a8c]/25" />

            {/* Inner text content circular badge */}
            <div className="absolute w-52 h-52 rounded-full bg-white shadow-xl border border-fuchsia-100 z-10 flex flex-col items-center justify-center p-3 text-center">
              <span className="text-indigo-600 text-[10px] font-bold tracking-widest uppercase mb-1">RIWI PLACEMENT</span>
              <span className="text-4.5xl font-black text-slate-900 tracking-tight leading-none">
                Band {riwiBands.overall.toFixed(1)}
              </span>
              <span className="text-[#e21a8c] font-black text-xs uppercase mt-2 bg-pink-50 px-3 py-1 rounded inline-block tracking-wide leading-none">
                RIWI {activeOverall.code} &middot; {activeOverall.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono mt-1">
                Score {overallEFSET}/100 Equiv
              </span>
            </div>
          </div>

          {/* Verified skill checklists row */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-4 text-[#0c2e55] font-bold text-sm">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0a3560] rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Reading
            </span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0a3560] rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Listening
            </span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0a3560] rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Writing
            </span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 bg-[#0a3560] rounded-full flex items-center justify-center text-white text-xs">✓</span>
              Speaking
            </span>
          </div>
        </div>

        {/* Evaluation Date ribbon */}
        <div className="bg-[#eef5fc] border-t border-b border-sky-100 py-3 text-center my-6">
          <span className="text-xs font-bold text-slate-600 font-mono tracking-widest uppercase">
            Awarded on: {result.studentInfo.date || "2026-01-30"}
          </span>
        </div>

        {/* Section: Understanding the results */}
        <div className="px-6 md:px-16 pt-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Understanding the results
            </h2>
          </div>

          {/* Grid comparison mapping of RIWI PLACEMENT TEST vs MCER */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-7 text-center divide-x divide-slate-200">
              {/* Row header */}
              <div className="col-span-7 bg-[#202a3a] text-slate-300 py-1.5 text-[9px] font-mono tracking-wider uppercase">
                RIWI PLACEMENT TEST Score Scale
              </div>

              {/* Range blocks */}
              {comparisonColumns.map((col, idx) => {
                const isActive = activeColumnIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className={`p-3 text-[10px] md:text-xs font-bold transition-all ${
                      isActive 
                        ? "bg-[#e21a8c] text-white" 
                        : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {col.range}
                  </div>
                );
              })}
            </div>

            {/* MCER Row mapping */}
            <div className="grid grid-cols-7 text-center divide-x divide-slate-200 border-t border-slate-200">
              {comparisonColumns.map((col, idx) => {
                const isActive = activeColumnIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className={`p-3 transition-all flex flex-col justify-between min-h-24 md:min-h-28 ${
                      isActive 
                        ? "bg-[#e21a8c] text-white" 
                        : "bg-white text-slate-700"
                    }`}
                  >
                    <div>
                      <span className="text-xs md:text-sm font-black uppercase text-center block">
                        {col.mcer}
                      </span>
                      <span className={`text-[10px] font-semibold font-mono block mt-1 leading-none ${
                        isActive ? "text-yellow-200" : "text-indigo-600"
                      }`}>
                        Band {col.band}
                      </span>
                    </div>
                    <span className={`text-[9px] md:text-[10px] leading-tight block mt-2 ${
                      isActive ? "text-fuchsia-50 opacity-90" : "text-slate-400"
                    }`}>
                      {col.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certifying reference explanation text */}
          <p className="text-slate-500 text-xs text-center leading-relaxed max-w-3xl mx-auto italic">
            This certifies an overall English proficiency classification of <span className="font-bold text-slate-900">RIWI Band {riwiBands.overall.toFixed(1)}</span> (conforming to the CEFR <span className="font-bold text-slate-900">{activeOverall.code} {activeOverall.name}</span> standard). The final score is calculated from the unified arithmetic average of all tested linguistic dimensions: Reading, Listening, Writing, and Speaking.
          </p>

          {/* Bottom concentric rings for individual skill tracks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10">
            {/* Ring 1: Leer */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 flex flex-col items-center text-center space-y-4">
              {/* Radial gauge circle */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg width="84" height="84" className="transform -rotate-90">
                  <circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                  <circle className="text-indigo-600 transition-all duration-1000" strokeWidth="4" strokeDasharray={226} strokeDashoffset={226 - (rScore100 / 100) * 226} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                </svg>
                <span className="absolute text-slate-900 font-extrabold text-lg">{rScore100}</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">Reading</h4>
                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wide block leading-none">Band {riwiBands.reading.toFixed(1)}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">{rLevel.code} {rLevel.name}</span>
              </div>
            </div>

            {/* Ring 2: Escuchar */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 flex flex-col items-center text-center space-y-4">
              {/* Radial gauge circle */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg width="84" height="84" className="transform -rotate-90">
                  <circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                  <circle className="text-purple-600 transition-all duration-1000" strokeWidth="4" strokeDasharray={226} strokeDashoffset={226 - (lScore100 / 100) * 226} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                </svg>
                <span className="absolute text-slate-900 font-extrabold text-lg">{lScore100}</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">Listening</h4>
                <span className="text-[11px] font-black text-purple-600 uppercase tracking-wide block leading-none">Band {riwiBands.listening.toFixed(1)}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">{lLevel.code} {lLevel.name}</span>
              </div>
            </div>

            {/* Ring 3: Escribir */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 flex flex-col items-center text-center space-y-4">
              {/* Radial gauge circle */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg width="84" height="84" className="transform -rotate-90">
                  <circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                  <circle className="text-emerald-500 transition-all duration-1000" strokeWidth="4" strokeDasharray={226} strokeDashoffset={226 - (wScore100 / 100) * 226} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                </svg>
                <span className="absolute text-slate-900 font-extrabold text-lg">{wScore100}</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">Writing</h4>
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wide block leading-none">Band {riwiBands.writing.toFixed(1)}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">{wLevel.code} {wLevel.name}</span>
              </div>
            </div>

            {/* Ring 4: Hablar */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 flex flex-col items-center text-center space-y-4">
              {/* Radial gauge circle */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg width="84" height="84" className="transform -rotate-90">
                  <circle className="text-slate-200" strokeWidth="4" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                  <circle className="text-amber-500 transition-all duration-1000" strokeWidth="4" strokeDasharray={226} strokeDashoffset={226 - (sScore100 / 100) * 226} strokeLinecap="round" stroke="currentColor" fill="transparent" r="36" cx="42" cy="42" />
                </svg>
                <span className="absolute text-slate-900 font-extrabold text-lg">{sScore100}</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">Speaking</h4>
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-wide block leading-none">Band {riwiBands.speaking.toFixed(1)}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">{sLevel.code} {sLevel.name}</span>
              </div>
            </div>
          </div>

          {/* Verification link footprint */}
          <div className="text-center pt-14 pb-2">
            <span className="text-[11px] font-sans font-medium text-slate-400 tracking-wider">
              cert.riwi.co/placement-test
            </span>
          </div>

        </div>
      </div>

      {/* VIEW 2: SECONDARY ANCILLARY IA ANALYSIS TAB */}
      <div className={`${activeTab === "analysis" ? "block" : "hidden print:hidden"} space-y-8`} id="ia-error-analysis-wrapper">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-md space-y-8">
          
          {/* Main header block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono tracking-widest rounded uppercase font-bold border border-indigo-100">
                Cambridge Placement Detailed Stats
              </span>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                Detailed Answers Analysis
              </h2>
            </div>
          </div>

          {/* Academic metadata fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50/60 p-6 rounded-xl border border-slate-200 font-sans text-sm">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono font-bold block">FULL NAME</span>
              <span className="font-bold text-slate-900 text-base">{result.studentInfo.name || "N/A"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono font-bold block">REGISTERED EMAIL</span>
              <span className="font-bold text-indigo-600 text-base break-all">{result.studentInfo.email || "N/A"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono font-bold block">ACADEMIC EVALUATOR</span>
              <span className="font-bold text-slate-800 text-base">{result.studentInfo.teacher || "N/A"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono font-bold block">SUBMISSION DATE</span>
              <span className="font-bold text-slate-800 text-base">{result.studentInfo.date || "N/A"}</span>
            </div>
          </div>

          {/* Section: Written essays detailed AI feedback */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 tracking-wider uppercase">
              AI Evaluator Verdict
            </h3>
            <div className="p-6 bg-slate-900 text-slate-100 rounded-xl space-y-4 border border-slate-800">
              <p className="text-sm leading-relaxed">
                {result.summary}
              </p>
              <div className="pt-3 border-t border-slate-800 text-xs text-indigo-300 font-mono">
                <strong>Level Classification:</strong> {getCEFRDescriptionDetail(result.overallCEFR)}
              </div>
            </div>
          </div>

          {/* Compilations feedback details split columns */}
          <div className="space-y-6 pt-6 border-t border-slate-150">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase">
              Writing Correction (Writing Portfolio)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task 1 details */}
              <div className="p-5 border border-slate-150 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Task 1 (80 - 120 words)</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold">
                    {result.scores.writing.task1.cefr} &middot; {result.scores.writing.task1.score}/10 pts
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Content Evaluation:</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    {result.scores.writing.task1.feedback}
                  </p>
                </div>
                {result.scores.writing.task1.corrections && (
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-mono leading-relaxed text-slate-600">
                    <span className="font-semibold text-rose-600 block text-[9px] uppercase tracking-wider mb-1">Suggested Improvements:</span>
                    {result.scores.writing.task1.corrections}
                  </div>
                )}
              </div>

              {/* Task 2 details */}
              <div className="p-5 border border-slate-150 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Task 2 (150 - 200 words)</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-bold">
                    {result.scores.writing.task2.cefr} &middot; {result.scores.writing.task2.score}/20 pts
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Content Evaluation:</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    {result.scores.writing.task2.feedback}
                  </p>
                </div>
                {result.scores.writing.task2.corrections && (
                  <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-mono leading-relaxed text-slate-600">
                    <span className="font-semibold text-rose-600 block text-[9px] uppercase tracking-wider mb-1">Suggested Improvements:</span>
                    {result.scores.writing.task2.corrections}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Oral Expression AI feedback */}
          <div className="space-y-3 pt-6 border-t border-slate-150">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase">
              Speaking Feedback & Analytics
            </h3>
            <div className="p-5 border border-indigo-100 bg-indigo-50/25 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Spoken Expression Evaluation</span>
                <span className="text-xs font-mono px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                  {result.scores.speaking.cefr} &middot; {result.scores.speaking.score}/20 pts
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {result.scores.speaking.feedback}
              </p>
            </div>
          </div>

          {/* Section 7: Correct Answer Keys detailed list (for students reference) */}
          <div className="space-y-6 pt-6 border-t border-slate-150" id="itemized-analysis-revisions">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase">
              Question-by-Question Review (Reading and Listening)
            </h3>
            
            <div className="space-y-4">
              {/* Grammar review */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-slate-500" />
                  Part 1 — Use of English (Multiple Choice)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {useOfEnglishQuestions.map((q) => {
                    const optionTxt = q.options.find(o => o.key === q.correctKey)?.text;
                    return (
                      <div key={q.id} className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between items-center border border-slate-100">
                        <div>
                          <span className="font-mono text-slate-400 block font-bold">Q{q.number}</span>
                          <span className="text-slate-700 text-[11px]">Correct: <strong>{q.correctKey}) {optionTxt}</strong></span>
                        </div>
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Listening review */}
              <div className="space-y-2 mt-4">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-500 animate-spin-slow" />
                  Part 3 — Listening Comprehension (Short Audio Questions Q1 to Q25)
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 border border-slate-100 p-3 rounded-xl bg-slate-50/50">
                  {listeningSections.flatMap(sect => sect.questions).map((q) => {
                    const correction = result.scores.listening.feedback[String(q.number)];
                    return (
                      <div key={q.number} className="p-3 bg-white border border-slate-150 rounded-lg text-xs space-y-1 shadow-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-slate-800">Q{q.number}. {q.question}</span>
                        </div>
                        <p className="text-indigo-600 font-mono text-[11px]">
                          <strong>Examiner Evaluation:</strong> {correction || "Response analyzed successfully by AI."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
