import type { User } from "@uno/shared";
import { createContext } from "react";

export const ProfileContext = createContext<User | null>(null);
