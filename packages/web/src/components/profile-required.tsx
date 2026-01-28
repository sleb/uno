import { Outlet } from "react-router-dom";
import { useProfile } from "../hooks/profile";
import CreateProfilePage from "./create-profile/create-profile-page";

const ProfileRequired = () => {
  const { user, loading } = useProfile();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <CreateProfilePage />;
  }

  return <Outlet />;
};

export default ProfileRequired;
