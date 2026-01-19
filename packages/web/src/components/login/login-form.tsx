import { auth } from "@/firebase";
import { Button } from "@mantine/core";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";

const LoginForm = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate(state?.from || "/");
    } catch (err) {
      console.error("Error signing in with Google:", err);
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
