import { auth } from "@/firebase";
import { useUser } from "@/hooks/user";
import { UNO_ICON_COLOR } from "@/theme";
import {
  Anchor,
  AppShell,
  Avatar,
  Container,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { signOut } from "firebase/auth";
import { FaChevronDown, FaSignOutAlt, FaUser } from "react-icons/fa";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { UnoLogo } from "./common";

const Layout = () => {
  const { displayName, avatar } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <AppShell header={{ height: 70 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" align="center">
            <Anchor component={Link} to="/dashboard">
              <UnoLogo size={32} />
            </Anchor>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="sm">
                    <Avatar size={36} radius="xl">
                      <Text size="lg">{avatar}</Text>
                    </Avatar>
                    <Group gap={4}>
                      <Text size="sm" fw={500}>
                        {displayName}
                      </Text>
                      <FaChevronDown size={12} color={UNO_ICON_COLOR} />
                    </Group>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item
                  leftSection={<FaUser color={UNO_ICON_COLOR} />}
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<FaSignOutAlt color={UNO_ICON_COLOR} />}
                  onClick={handleLogout}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
