import { Text } from "@mantine/core";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/auth";
import { auth } from "../firebase";

const AuthRequired = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUid(usr.uid);
      } else {
        setUid(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!uid) {
    return <Navigate to="/" state={{ from: location.pathname }} />;
  }

  return (
    <AuthContext value={uid}>
      <Outlet />
    </AuthContext>
  );
};

export default AuthRequired;
