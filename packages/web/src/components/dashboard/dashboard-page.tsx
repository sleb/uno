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
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import {
  FaGamepad,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import CreateGameForm from "@/components/dashboard/create-game-form";
import { useUser } from "@/hooks/user";
import { UNO_ICON_COLOR } from "@/theme";

const DashboardPage = () => {
  const { displayName, avatar } = useUser();
  const [showCreateGame, setShowCreateGame] = useState(false);

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

        {/* Create Game Button */}
        <Center>
          <Button
            size="lg"
            leftSection={showCreateGame ? <FaTimes /> : <FaPlus />}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 90 }}
            onClick={() => setShowCreateGame(!showCreateGame)}
          >
            {showCreateGame ? "Cancel" : "Create New Game"}
          </Button>
        </Center>

        {/* Create Game Form */}
        {showCreateGame && <CreateGameForm />}

        {/* Stats Section */}
        {!showCreateGame && (
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
        )}

        {/* Search/Filter Section */}
        {!showCreateGame && (
          <>
            <Stack gap="md">
              <TextInput
                placeholder="Search for games or enter game code..."
                leftSection={<FaSearch color={UNO_ICON_COLOR} />}
                size="md"
              />
            </Stack>

            {/* Games List */}
            <Stack gap="md">
              <Title order={2}>Your Games</Title>

              {/* Empty State */}
              <Card>
                <Center py="xl">
                  <Stack gap="md" align="center">
                    <FaGamepad size={60} color={UNO_ICON_COLOR} opacity={0.3} />
                    <Text c="dimmed" ta="center">
                      No active games yet
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Create a new game to get started!
                    </Text>
                  </Stack>
                </Center>
              </Card>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default DashboardPage;
