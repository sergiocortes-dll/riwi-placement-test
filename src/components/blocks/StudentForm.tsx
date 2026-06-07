import { format } from "date-fns";
import {
  Award,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  User,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import Instructions from "./Instructions";

interface StudentFormProps {
  currentVersion: string;
}

export default function StudentForm({ currentVersion }: StudentFormProps) {
  const [date, setDate] = React.useState<Date>();
  return (
    <div className="max-w-2xl mx-auto my-12" id="student-onboarding-container">
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden border-b border-slate-800">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-600 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>

          <div className="relative z-10 space-y-2">
            <Badge className="dark" variant="outline">
              Official Assessment Portal
            </Badge>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight text-balance">
              English Placement Test
            </h1>
            <p className="text-slate-400 leading-7 not-first:mt-6">
              Interactive holistic placement test designed to measure Grammar,
              Reading, Listening, Writing, and Speaking capabilities (CEFR).
            </p>
          </div>
        </div>

        {/* Form body. */}
        <form className="p-8 space-y-6">
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Badge
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  variant="outline"
                >
                  EXAMEN ACTIVO
                </Badge>
                <h2 className="text-sm font-bold text-slate-800 mt-1 font-sans">
                  Evaluando Versión del Examen:{" "}
                  <span className="text-indigo-600 font-mono font-extrabold">
                    {currentVersion}
                  </span>
                </h2>
                <p className="text-slate-500 text-[11px] leading-relaxed font-sans mt-0.5">
                  La estructura técnica es idéntica en todas las versiones, pero
                  las preguntas y lecturas varían.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-3xs">
                <span
                  className={`w-2.5 h-2.5 ${currentVersion ? "bg-green-500" : "bg-red-500"} rounded-full animate-pulse`}
                ></span>
                <span className="text-[11px] font-mono font-bold text-slate-700">
                  Versión{" "}
                  {currentVersion ? `${currentVersion} Activa` : "Inactiva"}
                </span>
              </div>
            </div>
          </div>

          {/* Form. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name. */}
            <Field>
              <FieldLabel htmlFor="full-name">
                <User size={15} />
                Full Name<span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="full-name" placeholder="e.g., Kate Acosta" required />
            </Field>

            {/* Email. */}
            <Field>
              <FieldLabel htmlFor="email">
                <Mail size={15} />
                Email<span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="e.g., kate.acosta@example.com"
                required
              />
            </Field>

            {/* Teacher */}
            <Field>
              <FieldLabel htmlFor="teacher">
                <BookOpen size={15} />
                Teacher<span className="text-destructive">*</span>
              </FieldLabel>
              <Input id="teacher" placeholder="e.g., Mr. Smith" required />
            </Field>

            {/* Date */}
            <Field>
              <FieldLabel htmlFor="date">
                <CalendarIcon size={15} />
                Evaluation Date<span className="text-destructive">*</span>
              </FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      id="date-picker-simple"
                      className="justify-start font-normal"
                    >
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    defaultMonth={date}
                  />
                </PopoverContent>
              </Popover>
            </Field>
          </div>

          {/* General Info Tag */}
          <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-100 flex items-start gap-3">
            <Clock className="text-indigo-600 shrink-0 mt-0.5" size={16} />
            <div>
              <h4 className="text-xs font-bold text-slate-700 font-sans">
                Official Time Limit
              </h4>
              <p className="text-slate-500 text-[11px] mt-1 leading-relaxed font-sans">
                You will have <strong>90 continuous minutes</strong> once the
                test starts. Upon timer expiration, your answers will be
                automatically submitted for grading.
              </p>
            </div>
          </div>

          <Separator />

          <Instructions />

          <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-4 flex items-start gap-3">
            <Field orientation="horizontal">
              <Checkbox
                id="terms-checkbox-2"
                name="terms-checkbox-2"
                defaultChecked
              />
              <FieldContent>
                <FieldLabel htmlFor="terms-checkbox-2">
                  Accept terms and conditions
                </FieldLabel>
                <FieldDescription>
                  I have read the guidelines and certify that I will complete
                  this test with academic integrity, individually, and without
                  help from dictionaries, translators, or other people.
                </FieldDescription>
              </FieldContent>
            </Field>
          </div>

          {/* Action Button. */}
          <Button render={<Link to="/test" />} size="lg" className="w-full">
            <Award size={16} />
            Start Placement Test
          </Button>
        </form>
      </div>
    </div>
  );
}
