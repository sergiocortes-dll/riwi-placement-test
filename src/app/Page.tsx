import StudentForm from "@/components/blocks/StudentForm";
import { GraduationCap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
        <GraduationCap size={44} className="text-slate-900" />
        <StudentForm />
      </div>
    </div>
  );
}
