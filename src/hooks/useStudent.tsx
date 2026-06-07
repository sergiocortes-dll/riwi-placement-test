import { StudentContext } from "@/context/studentContext";
import { use } from "react";

export function useStudent() {
  const context = use(StudentContext);

  if (!context) {
    throw new Error("useStudent must be used within a StudentProvider");
  }

  return context;
}
