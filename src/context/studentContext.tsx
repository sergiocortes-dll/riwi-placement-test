import * as React from "react";

const StudentContext = React.createContext(null);

const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const [student, setStudent] = React.useState();

  return <StudentContext value={{ student }}>{children}</StudentContext>;
};

export { StudentContext, StudentProvider };
