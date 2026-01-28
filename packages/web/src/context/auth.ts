import { createContext } from "react";

export type AuthContextValue = {
  uid: string | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
