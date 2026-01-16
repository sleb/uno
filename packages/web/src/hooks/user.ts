import type { User } from "@uno/shared";
import { useContext } from "react";
import { AuthContext } from "@/context/auth";

export const useUser = (): User => {
  const uid = useContext(AuthContext);
  if (!uid) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return { uid };
};
