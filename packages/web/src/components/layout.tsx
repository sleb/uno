import { Anchor, AppShell, Button, Container, Group } from "@mantine/core";
import { signOut } from "firebase/auth";
import { FaSignOutAlt } from "react-icons/fa";
import { Link, Outlet } from "react-router-dom";
import { auth } from "@/firebase";
import { UNO_ICON_COLOR } from "@/theme";
import { UnoLogo } from "./common";

const Layout = () => {
  return (
    <AppShell header={{ height: 70 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" align="center">
            <Anchor component={Link} to="/dashboard">
              <UnoLogo size={32} />
            </Anchor>
            <Group gap="md">
              <Button
                variant="subtle"
                leftSection={<FaSignOutAlt color={UNO_ICON_COLOR} />}
                onClick={() => signOut(auth)}
              >
                Log out
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
