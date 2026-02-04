import {
  Anchor,
  AppShell,
  Avatar,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { signOut } from "firebase/auth";
import {
  FaBook,
  FaChevronDown,
  FaHome,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { useUser } from "../hooks/user";
import { UNO_ICON_COLOR } from "../theme";
import { UnoLogo } from "./common";

const Layout = () => {
  const { displayName, avatar } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [
    mobileMenuOpened,
    { toggle: toggleMobileMenu, close: closeMobileMenu },
  ] = useDisclosure();

  const handleLogout = async () => {
    await signOut(auth);
    closeMobileMenu();
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FaHome size={16} /> },
    { label: "Rules", path: "/rules", icon: <FaBook size={16} /> },
    { label: "Profile", path: "/profile", icon: <FaUser size={16} /> },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  return (
    <AppShell header={{ height: 70 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" align="center">
            <Group gap="xl">
              <Anchor
                component={Link}
                to="/"
                style={{ textDecoration: "none" }}
              >
                <UnoLogo size={32} />
              </Anchor>

              {/* Desktop Navigation */}
              <Group gap="md" visibleFrom="sm">
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    variant={
                      location.pathname === item.path ? "light" : "subtle"
                    }
                    color="unoBlue"
                    leftSection={item.icon}
                    size="sm"
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
            </Group>

            <Group gap="md">
              {/* Desktop User Menu */}
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <UnstyledButton visibleFrom="sm">
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

              {/* Mobile Burger Menu */}
              <Burger
                opened={mobileMenuOpened}
                onClick={toggleMobileMenu}
                hiddenFrom="sm"
                size="sm"
              />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer
        opened={mobileMenuOpened}
        onClose={closeMobileMenu}
        position="right"
        size="xs"
        title={
          <Group gap="sm">
            <Avatar size={36} radius="xl">
              <Text size="lg">{avatar}</Text>
            </Avatar>
            <Text size="sm" fw={500}>
              {displayName}
            </Text>
          </Group>
        }
      >
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={item.icon}
              active={location.pathname === item.path}
              onClick={() => handleNavClick(item.path)}
              color="unoBlue"
            />
          ))}

          <Divider my="sm" />

          <NavLink
            label="Log out"
            leftSection={<FaSignOutAlt size={16} />}
            onClick={handleLogout}
            color="red"
          />
        </Stack>
      </Drawer>

      <AppShell.Main>
        <Container size="xl">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
