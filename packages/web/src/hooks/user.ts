import type { User } from "@uno/shared";
import { useContext } from "react";
import { ProfileContext } from "../context/profile";

export const useUser = (): User => {
  const user = useContext(ProfileContext);
  if (!user) {
    throw new Error("useUser must be used within a ProfileContext provider");
  }
  return user;
};
