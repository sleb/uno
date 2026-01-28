import "@fontsource/russo-one";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import AuthProvider from "./components/auth-provider";
import { UnoNotificationsHost } from "./components/notifications";
import { router } from "./router";
import { theme } from "./theme";

const elem = document.getElementById("root");
if (!elem) {
  throw new Error("Root element not found");
}

const queryClient = new QueryClient();

const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <AuthProvider>
          <UnoNotificationsHost />
          <RouterProvider router={router} />
        </AuthProvider>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>
);

if (import.meta.hot) {
  const root = import.meta.hot.data.root ?? createRoot(elem);
  import.meta.hot.data.root = root;
  root.render(app);
} else {
  createRoot(elem).render(app);
}
