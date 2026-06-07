import TestHeader from "@/components/blocks/TestHeader";
import { TestProvider } from "@/context/testContext";
import { Outlet } from "react-router";

export default function TestLayout() {
  return (
    <TestProvider>
      <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800 flex flex-col">
        <TestHeader />
        <Outlet />
      </div>
    </TestProvider>
  );
}
