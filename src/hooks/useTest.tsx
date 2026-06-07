import { TestContext } from "@/context/testContext";
import { use } from "react";

export function useTest() {
  const context = use(TestContext);

  if (!context) {
    throw new Error("useTest must be used within a TestProvider");
  }

  return context;
}
