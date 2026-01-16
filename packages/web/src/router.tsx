import { createBrowserRouter } from "react-router-dom";
import AuthRequired from "./components/auth-required";
import DashboardPage from "./components/dashboard/dashboard-page";
import HomePage from "./components/home/home-page";
import Layout from "./components/layout";
import LobbyPage from "./components/lobby/lobby-page";
import LoginPage from "./components/login/login-page";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      {
        element: <AuthRequired />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: "dashboard", element: <DashboardPage /> },
              { path: "lobby", element: <LobbyPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
