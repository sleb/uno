import CreateProfilePage from "@/components/create-profile/create-profile-page";
import { ProfileContext } from "@/context/profile";
import { useUid } from "@/hooks/uid";
import { onProfileChange } from "@/service/profile-service";
import type { User } from "@uno/shared";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

const ProfileRequired = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const uid = useUid();

  useEffect(() => {
    return onProfileChange(uid, (data) => {
      setUser(data);
      setLoading(false);
    });
  }, [uid]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <CreateProfilePage />;
  }

  return (
    <ProfileContext value={user}>
      <Outlet />
    </ProfileContext>
  );
};

export default ProfileRequired;
