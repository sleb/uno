import type { User } from "@uno/shared";
import { type ReactNode, useEffect, useState } from "react";
import { ProfileContext, type ProfileContextValue } from "../context/profile";
import { useUid } from "../hooks/uid";
import { onProfileChange } from "../service/profile-service";
import { notifyError } from "./notifications";

type ProfileProviderProps = { children: ReactNode };

const ProfileProvider = ({ children }: ProfileProviderProps) => {
  const uid = useUid();
  const [value, setValue] = useState<ProfileContextValue>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    setValue({ user: null, loading: true });
    const unsubscribe = onProfileChange(
      uid,
      (data: User | null) => {
        setValue({ user: data, loading: false });
      },
      (error) => {
        setValue({ user: null, loading: false });
        notifyError(error);
      },
    );
    return () => unsubscribe();
  }, [uid]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export default ProfileProvider;
