import { Button, Flex } from "@mantine/core";
import { signOut } from "firebase/auth";
import { Outlet } from "react-router-dom";
import { auth } from "@/firebase";
import { useUser } from "@/hooks/user";

const Layout = () => {
  const { uid } = useUser();
  return (
    <Flex direction="column" w="100%" h="100vh" gap={10}>
      <Button variant="transparent" onClick={() => signOut(auth)}>
        Log out ({uid})
      </Button>
      <Outlet />
    </Flex>
  );
};

export default Layout;
