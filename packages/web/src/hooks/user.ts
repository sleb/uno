import type { User } from "@uno/shared";
import { useProfile } from "./profile";

export const useUser = (): User => {
  const { user, loading } = useProfile();
  if (loading) {
    throw new Error("useUser called before profile state is ready");
  }
  if (!user) {
    throw new Error("useUser must be used within a ProfileContext provider");
  }
  return user;
};
