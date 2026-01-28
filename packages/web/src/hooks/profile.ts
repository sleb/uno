import { useContext } from "react";
import { ProfileContext, type ProfileContextValue } from "../context/profile";

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
};
