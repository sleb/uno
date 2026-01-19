import { useUser } from "@/hooks/user";
import { UNO_ICON_COLOR } from "@/theme";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { FaGamepad, FaPlus, FaTrophy, FaUsers } from "react-icons/fa";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const { displayName, avatar } = useUser();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Welcome Section */}
        <Center>
          <Stack gap="md" align="center">
            <Avatar size={80} radius="xl">
              <Text size="3rem">{avatar}</Text>
            </Avatar>
            <Title order={1}>Welcome back, {displayName}!</Title>
            <Text size="lg" c="dimmed" ta="center">
              Your UNO! games dashboard
            </Text>
          </Stack>
        </Center>

        {/* Quick Actions */}
        <Center>
          <Button
            component={Link}
            to="/lobby"
            size="lg"
            leftSection={<FaPlus />}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 90 }}
          >
            New Game
          </Button>
        </Center>

        {/* Stats Section */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Card>
            <Stack gap="sm" align="center">
              <FaGamepad size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Active Games
              </Title>
              <Badge size="xl" variant="filled" color="unoBlue">
                0
              </Badge>
              <Text size="sm" c="dimmed" ta="center">
                Games in progress
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="sm" align="center">
              <FaTrophy size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Wins
              </Title>
              <Badge size="xl" variant="filled" color="unoGreen">
                0
              </Badge>
              <Text size="sm" c="dimmed" ta="center">
                Total victories
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="sm" align="center">
              <FaUsers size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Friends
              </Title>
              <Badge size="xl" variant="filled" color="unoYellow">
                0
              </Badge>
              <Text size="sm" c="dimmed" ta="center">
                Connected players
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Active Games Section */}
        <Stack gap="md">
          <Title order={2}>Your Games</Title>
          <Card>
            <Center py="xl">
              <Stack gap="md" align="center">
                <FaGamepad size={60} color={UNO_ICON_COLOR} opacity={0.3} />
                <Text c="dimmed" ta="center">
                  No active games yet
                </Text>
                <Button
                  component={Link}
                  to="/lobby"
                  leftSection={<FaPlus />}
                  variant="light"
                >
                  Start a New Game
                </Button>
              </Stack>
            </Center>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
