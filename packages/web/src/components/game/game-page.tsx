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
import type { Game, GamePlayer } from "@uno/shared";
import { useEffect, useMemo, useState } from "react";
import { FaCheck, FaCog, FaCopy, FaLink } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../hooks/user";
import {
  joinGame,
  onGamePlayersUpdate,
  onGameUpdate,
  startGame,
} from "../../service/game-service";
import GameBoard from "./game-board";
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

  if (game.state.status === "in-progress") {
    return <GameBoard game={game} currentUserId={user.id} />;
  }

  if (game.state.status === "completed") {
    return <CompletedGame game={game} currentUserId={user.id} />;
  }

  return (
    <Center h="60vh">
      <Text>Game state: {game.state.status} (not yet implemented)</Text>
    </Center>
  );
};

interface CompletedGameProps {
  game: Game;
  currentUserId: string;
}

const CompletedGame = ({ game, currentUserId }: CompletedGameProps) => {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    return onGamePlayersUpdate(game.id, setPlayers);
  }, [game.id]);

  const sortedPlayers = useMemo(() => {
    const playerMap = new Map(players.map((player) => [player.id, player]));
    return game.players
      .map((playerId) => playerMap.get(playerId))
      .filter((player): player is GamePlayer => player !== undefined);
  }, [game.players, players]);

  const winner = sortedPlayers.find((player) => player.status === "winner");
  const winnerLabel = winner
    ? winner.id === currentUserId
      ? "You won!"
      : `${winner.displayName} won!`
    : "Game complete";

  return (
    <Center h="60vh">
      <Stack gap="lg" align="center" maw={600} w="100%">
        <Title order={2}>Game Over</Title>
        <Badge
          size="xl"
          variant="gradient"
          gradient={{ from: "unoGreen.4", to: "green", deg: 90 }}
        >
          {winnerLabel}
        </Badge>
        <Card withBorder shadow="sm" radius="md" p="lg" w="100%">
          <Stack gap="sm">
            <Text fw={600}>Final Cards</Text>
            {sortedPlayers.length === 0 ? (
              <Text c="dimmed">Loading results...</Text>
            ) : (
              <Stack gap="xs">
                {sortedPlayers.map((player) => (
                  <Group key={player.id} justify="space-between">
                    <Text fw={player.id === winner?.id ? 600 : 400}>
                      {player.displayName}
                      {player.id === currentUserId ? " (You)" : ""}
                    </Text>
                    <Badge
                      color={player.id === winner?.id ? "unoGreen" : "gray"}
                      variant="light"
                    >
                      {player.cardCount} {player.cardCount === 1 ? "card" : "cards"}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
        <Button
          variant="gradient"
          gradient={{ from: "unoBlue.4", to: "cyan", deg: 90 }}
          onClick={() => navigate("/dashboard")}
        >
          Return to Dashboard
        </Button>
      </Stack>
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
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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

  const handleStartGame = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await startGame(game.id);
    } catch (error) {
      console.error("Error starting game:", error);
      setStartError("Failed to start game. Please try again.");
    } finally {
      setStarting(false);
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
        {(joinError || startError) && (
          <Stack gap={4} align="center">
            {joinError && (
              <Text c="red" size="sm" ta="center">
                {joinError}
              </Text>
            )}
            {startError && (
              <Text c="red" size="sm" ta="center">
                {startError}
              </Text>
            )}
          </Stack>
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
                loading={starting}
                onClick={handleStartGame}
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
