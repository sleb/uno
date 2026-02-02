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
import { useState } from "react";
import { FaGamepad, FaPlus, FaTimes, FaTrophy, FaUsers } from "react-icons/fa";
import { useUser } from "../../hooks/user";
import { useUserGames } from "../../hooks/user-games";
import { UNO_ICON_COLOR } from "../../theme";
import CreateGameForm from "./create-game-form";
import GameSearch from "./game-search";
import YourGamesTable from "./your-games-table";

const DashboardPage = () => {
  const { displayName, avatar } = useUser();
  const { games } = useUserGames();
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeGamesCount = games.filter(
    (game) =>
      game.state.status === "waiting" || game.state.status === "in-progress",
  ).length;

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
                  {activeGamesCount}
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
            <GameSearch onSearchChange={setSearchQuery} />

            {/* Games List - Title is now part of YourGamesTable component */}
            <YourGamesTable searchQuery={searchQuery} />
          </>
        )}
      </Stack>
    </Container>
  );
};

export default DashboardPage;
