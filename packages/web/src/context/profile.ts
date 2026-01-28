import type { User } from "@uno/shared";
import { createContext } from "react";

export type ProfileContextValue = {
  user: User | null;
  loading: boolean;
};

export const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);
