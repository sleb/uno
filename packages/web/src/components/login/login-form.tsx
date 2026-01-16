import { Button, Flex } from "@mantine/core";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/firebase";

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
    <Flex direction="column" gap={10}>
      <Button
        leftSection={<FcGoogle fontSize="1.5rem" />}
        variant="outline"
        onClick={signInWithGoogle}
      >
        Sign in with Google
      </Button>
    </Flex>
  );
};

export default LoginForm;
