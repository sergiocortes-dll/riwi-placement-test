import { keys } from "@/utils/constants";
import * as React from "react";

interface TestContextValue {
  secondsLeft: number;
  setSecondsLeft: React.Dispatch<React.SetStateAction<number>>;
}

const TestContext = React.createContext<TestContextValue | null>(null);

const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const [secondsLeft, setSecondsLeft] = React.useState<number>(() => {
    const saved = localStorage.getItem(keys.timer);

    if (saved) {
      const parsed = Number.parseInt(saved, 10);

      if (!Number.isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return 5400;
  });

  React.useEffect(() => {
    localStorage.setItem(keys.timer, secondsLeft.toString());
  }, [secondsLeft]);

  const value = React.useMemo(
    () => ({
      secondsLeft,
      setSecondsLeft,
    }),
    [secondsLeft],
  );

  return <TestContext value={value}>{children}</TestContext>;
};

export { TestContext, TestProvider };
