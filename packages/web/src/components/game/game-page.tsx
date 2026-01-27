import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  CopyButton,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import type { Game } from "@uno/shared";
import { useEffect, useState } from "react";
import { FaCheck, FaCog, FaCopy, FaLink } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { useUser } from "../../hooks/user";
import { joinGame, onGameUpdate } from "../../service/game-service";
import PlayersSection from "./players-section";

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!gameId) return;

    return onGameUpdate(gameId, (updatedGame) => {
      setGame(updatedGame);
      setLoading(false);
    });
  }, [gameId]);

  if (loading) {
    return (
      <Center h="60vh">
        <Text size="lg" c="dimmed">
          Loading game...
        </Text>
      </Center>
    );
  }

  if (!game) {
    return (
      <Center h="60vh">
        <Stack align="center" gap="md">
          <Text size="xl" fw={700}>
            Game not found
          </Text>
          <Text c="dimmed">Game ID: {gameId}</Text>
        </Stack>
      </Center>
    );
  }

  if (game.state.status === "waiting") {
    return <WaitingLobby game={game} currentUserId={user.id} />;
  }

  // Placeholder for other game states
  return (
    <Center h="60vh">
      <Text>Game state: {game.state.status} (not yet implemented)</Text>
    </Center>
  );
};

interface WaitingLobbyProps {
  game: Game;
  currentUserId: string;
}

const WaitingLobby = ({ game, currentUserId }: WaitingLobbyProps) => {
  const inviteUrl = `${window.location.origin}/game/${game.id}`;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isPlayerInGame = game.players.includes(currentUserId);
  const hasOpenSpots = game.players.length < game.config.maxPlayers;
  const canJoin = !isPlayerInGame && hasOpenSpots;

  const handleJoinGame = async () => {
    setJoining(true);
    setJoinError(null);
    try {
      await joinGame(game.id);
    } catch (error) {
      console.error("Error joining game:", error);
      setJoinError("Failed to join game. Please try again.");
      setJoining(false);
    }
  };

  return (
    <Box p="md">
      <Stack gap="xl" maw={900} mx="auto">
        {/* Header */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Title order={1}>Game Lobby</Title>
            <Badge
              size="lg"
              variant="gradient"
              gradient={{ from: "unoBlue.4", to: "cyan", deg: 90 }}
            >
              Waiting for players
            </Badge>
          </Group>
        </Stack>

        {/* Invite Section */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <FaLink size={20} style={{ color: "#3498db" }} />
              <Text fw={600} size="lg">
                Invite Players
              </Text>
            </Group>

            <Divider />

            <Box>
              <Text size="sm" fw={500} mb="xs">
                Share this link with friends to join
              </Text>
              <Paper withBorder p="md" bg="gray.0" radius="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Text
                    size="sm"
                    ff="monospace"
                    c="dimmed"
                    truncate
                    style={{ flex: 1 }}
                  >
                    {inviteUrl}
                  </Text>
                  <CopyButton value={inviteUrl} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? "Copied!" : "Copy link"}
                        withArrow
                      >
                        <ActionIcon
                          color={copied ? "teal" : "unoBlue"}
                          variant="light"
                          onClick={copy}
                          size="lg"
                        >
                          {copied ? (
                            <FaCheck size={18} />
                          ) : (
                            <FaCopy size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            </Box>
          </Stack>
        </Card>

        {/* Players Section */}
        <PlayersSection game={game} currentUserId={currentUserId} />

        {/* Game Settings */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <FaCog size={20} style={{ color: "#e74c3c" }} />
              <Text fw={600} size="lg">
                Game Settings
              </Text>
            </Group>

            <Divider />

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Max Players
                  </Text>
                  <Text fw={600}>{game.config.maxPlayers}</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Privacy
                  </Text>
                  <Text fw={600}>
                    {game.config.isPrivate ? "Private" : "Public"}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={12}>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    House Rules
                  </Text>
                  {game.config.houseRules.length > 0 ? (
                    <Group gap="xs">
                      {game.config.houseRules.map((rule) => (
                        <Badge key={rule} variant="light" color="unoBlue">
                          {rule}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text fw={600} c="dimmed" fs="italic">
                      Standard rules
                    </Text>
                  )}
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        {/* Action Buttons */}
        {joinError && (
          <Text c="red" size="sm" ta="center">
            {joinError}
          </Text>
        )}

        <Group justify="space-between">
          {isPlayerInGame ? (
            <>
              <Button variant="light" color="gray" size="lg">
                Leave Game
              </Button>
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "unoGreen.5", to: "green", deg: 90 }}
                disabled={game.players.length < 2}
              >
                Start Game
              </Button>
            </>
          ) : (
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: "unoBlue.4", to: "cyan", deg: 90 }}
                disabled={!canJoin}
                loading={joining}
                onClick={handleJoinGame}
              >
                {hasOpenSpots ? "Join Game" : "Game Full"}
              </Button>
          )}
        </Group>
      </Stack>
    </Box>
  );
};

export default GamePage;
