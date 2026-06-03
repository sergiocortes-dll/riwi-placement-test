import Layout from "@/app/Layout";
import { createBrowserRouter } from "react-router";
import Page from "./app/Page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Page,
      },
    ],
  },
]);
