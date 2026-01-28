import { onAuthStateChanged } from "firebase/auth";
import { type ReactNode, useEffect, useState } from "react";
import { AuthContext, type AuthContextValue } from "../context/auth";
import { auth } from "../firebase";

type AuthProviderProps = { children: ReactNode };

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [value, setValue] = useState<AuthContextValue>({
    uid: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setValue({ uid: usr ? usr.uid : null, loading: false });
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
