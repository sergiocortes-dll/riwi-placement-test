export interface StudentInfo {
  name: string;
  email: string;
  date: string;
  teacher: string;
  startedAt: string | null;
}

export interface WritingTaskAnswer {
  optionSelected: number;
  text: string;
}

export interface TestAnswers {
  useOfEnglish: Record<string, string>; // Q1 - Q20
  reading: {
    openAnswers: Record<string, string>; // Q1 - Q10, Q16 - Q20
    mcqAnswers: Record<string, string>; // Q11 - Q15
  };
  listening: Record<string, string>; // Q1 - Q20
  writing: {
    task1: WritingTaskAnswer;
    task2: WritingTaskAnswer;
  };
  speaking: Record<string, string>; // Selected speaking question index -> answer text
}

export interface EvaluationResult {
  studentInfo: StudentInfo;
  scores: {
    useOfEnglish: { score: number; max: number; percentage: number };
    readingMcq: { score: number; max: number; percentage: number };
    readingOpen: { score: number; max: number; feedback: Record<string, string> };
    listening: { score: number; max: number; feedback: Record<string, string> };
    writing: {
      task1: { score: number; max: number; cefr: string; feedback: string; corrections: string };
      task2: { score: number; max: number; cefr: string; feedback: string; corrections: string };
    };
    speaking: {
      score: number;
      max: number;
      cefr: string;
      feedback: string;
    };
  };
  overallCEFR: string;
  overallScore: number;
  overallPercentage: number;
  summary: string;
  riwiBands?: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
    overall: number;
  };
}
