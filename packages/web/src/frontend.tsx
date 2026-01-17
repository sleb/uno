import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { theme } from "./theme";
import "@mantine/core/styles.css";
import "@fontsource/russo-one";

const elem = document.getElementById("root");
if (!elem) {
  throw new Error("Root element not found");
}

const app = (
  <StrictMode>
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>
);

if (import.meta.hot) {
  const root = import.meta.hot.data.root ?? createRoot(elem);
  import.meta.hot.data.root = root;
  root.render(app);
} else {
  createRoot(elem).render(app);
}
