import { ProfileContext } from "@/context/profile";
import type { User } from "@uno/shared";
import { useContext } from "react";

export const useUser = (): User => {
  const user = useContext(ProfileContext);
  if (!user) {
    throw new Error("useUser must be used within a ProfileContext provider");
  }
  return user;
};
