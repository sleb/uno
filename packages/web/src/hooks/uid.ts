import { useAuth } from "./auth";

export const useUid = (): string => {
  const { uid, loading } = useAuth();
  if (loading) {
    throw new Error("useUid called before auth state is ready");
  }
  if (!uid) {
    throw new Error("useUid must be used within an authenticated context");
  }
  return uid;
};
