import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useStudent } from "@/hooks";
import { useTest } from "@/hooks/useTest";
import formatTimer from "@/utils/formatTimer";
import { AlarmClock, GraduationCap, Send } from "lucide-react";

export default function TestHeader() {
  const { student } = useStudent();
  const { secondsLeft } = useTest();
  return (
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
              ACTIVE EXAM &middot;{" "}
              <span className="text-slate-800 font-extrabold">
                {student?.name} ({student?.email})
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6">
          {/* Countdown timer widget. */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 font-mono font-bold text-xs">
            <AlarmClock size={15} className="animate-pulse" />
            <span>{formatTimer(secondsLeft)} remaining</span>
          </div>

          {/* Quick Finish button. */}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button>
                  <Send size={12} /> Submit Exam
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Assessment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to grade and complete your English
                  Placement Test? Your solutions across all sections will be
                  evaluated. This action is final and your scores will be
                  calculated immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel, Keep Answering</AlertDialogCancel>
                <AlertDialogAction>Yes, Submit Exam</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
