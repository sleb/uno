import { createBrowserRouter } from "react-router-dom";
import AuthRequired from "./components/auth-required";
import DashboardPage from "./components/dashboard/dashboard-page";
import GamePage from "./components/game/game-page";
import HomePage from "./components/home/home-page";
import Layout from "./components/layout";
import LoginPage from "./components/login/login-page";
import ProfilePage from "./components/profile/profile-page";
import ProfileRequired from "./components/profile-required";
import RulesPage from "./components/rules/rules-page";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "rules", element: <RulesPage /> },
      {
        element: <AuthRequired />,
        children: [
          {
            element: <ProfileRequired />,
            children: [
              {
                element: <Layout />,
                children: [
                  { path: "dashboard", element: <DashboardPage /> },
                  { path: "profile", element: <ProfilePage /> },
                  { path: "game/:gameId", element: <GamePage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
