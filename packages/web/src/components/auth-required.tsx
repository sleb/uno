import { Text } from "@mantine/core";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/auth";
import ProfileProvider from "./profile-provider";

const AuthRequired = () => {
  const { uid, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!uid) {
    return <Navigate to="/" state={{ from: location.pathname }} />;
  }

  return (
    <ProfileProvider>
      <Outlet />
    </ProfileProvider>
  );
};

export default AuthRequired;
