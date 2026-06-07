import * as React from "react";

interface Student {
  name: string;
  email: string;
}

interface StudentContextValue {
  student: Student | null;
  setStudent: React.Dispatch<React.SetStateAction<Student | null>>;
}

const StudentContext = React.createContext<StudentContextValue | null>(null);

const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = React.useState<Student | null>(null);

  const value = React.useMemo(() => ({ student, setStudent }), [student]);

  return <StudentContext value={value}>{children}</StudentContext>;
};

export { StudentContext, StudentProvider };
