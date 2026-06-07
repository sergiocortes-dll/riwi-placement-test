import Layout from "@/app/Layout";
import { createBrowserRouter } from "react-router";
import Page from "./app/Page";
import TestLayout from "./app/test/Layout";
import TestPage from "./app/test/Page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Page,
      },
      {
        path: "/test",
        Component: TestLayout,
        children: [
          {
            index: true,
            Component: TestPage,
          },
        ],
      },
    ],
  },
]);
