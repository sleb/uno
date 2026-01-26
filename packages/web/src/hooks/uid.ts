import { useContext } from "react";
import { AuthContext } from "../context/auth";

export const useUid = (): string => {
  const uid = useContext(AuthContext);
  if (!uid) {
    throw new Error("useUid must be used within an AuthProvider");
  }
  return uid;
};
