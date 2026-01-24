import { Button } from "@mantine/core";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/firebase";
import { notifyError } from "../notifications";

const LoginForm = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(state?.from || "/");
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <Button
      leftSection={<FcGoogle fontSize="1.5rem" />}
      variant="outline"
      onClick={signInWithGoogle}
      size="lg"
    >
      Sign in with Google
    </Button>
  );
};

export default LoginForm;
