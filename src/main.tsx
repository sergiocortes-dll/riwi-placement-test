import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { StudentProvider } from "./context/studentContext.tsx";
import "./index.css";
import { router } from "./router.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudentProvider>
      <RouterProvider router={router} />
    </StudentProvider>
  </StrictMode>,
);
