import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { Game, GamePlayer } from "@uno/shared";
import { useEffect, useMemo, useState } from "react";
import { FaTrophy } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { onGamePlayersUpdate } from "../../service/game-service";
import "./confetti.css";

interface CompletedGameProps {
  game: Game;
  currentUserId: string;
}

const CompletedGame = ({ game, currentUserId }: CompletedGameProps) => {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
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
  const isCurrentUserWinner = winner?.id === currentUserId;

  // Show confetti for winner
  useEffect(() => {
    if (isCurrentUserWinner) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isCurrentUserWinner]);

  const winnerLabel = winner
    ? winner.id === currentUserId
      ? "🎉 You won! 🎉"
      : `${winner.displayName} won!`
    : "Game complete";

  return (
    <Center h="60vh" pos="relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 50 }, (_, i) => `confetti-${i}-${Math.random()}`).map((key) => (
            <div
              key={key}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ["#E03131", "#FCC419", "#51CF66", "#228BE6"][
                  Math.floor(Math.random() * 4)
                ],
              }}
            />
          ))}
        </div>
      )}

      <Stack gap="lg" align="center" maw={700} w="100%" style={{ zIndex: 1 }}>
        <Title order={2}>Game Over</Title>
        <Badge
          size="xl"
          variant="gradient"
          gradient={{ from: "unoGreen.4", to: "green", deg: 90 }}
        >
          {winnerLabel}
        </Badge>

        {/* Show final scores table if available */}
        {game.finalScores ? (
          <Card withBorder shadow="sm" radius="md" p="lg" w="100%">
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={600} size="lg">
                  Final Standings
                </Text>
                <Badge color="unoGreen" variant="light" size="lg">
                  {game.finalScores.winnerScore} points
                </Badge>
              </Group>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Rank</Table.Th>
                    <Table.Th>Player</Table.Th>
                    <Table.Th ta="center">Cards Left</Table.Th>
                    <Table.Th ta="right">Points</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {game.finalScores.playerScores
                    .sort((a, b) => a.rank - b.rank)
                    .map((playerScore) => {
                      const isWinner = playerScore.rank === 1;
                      const isCurrentUser =
                        playerScore.playerId === currentUserId;

                      return (
                        <Table.Tr
                          key={playerScore.playerId}
                          bg={isWinner ? "unoGreen.0" : undefined}
                        >
                          <Table.Td>
                            <Group gap="xs">
                              {isWinner && (
                                <FaTrophy color="#FFD700" size={16} />
                              )}
                              <Text fw={isWinner ? 700 : 400}>
                                {playerScore.rank === 1
                                  ? "1st"
                                  : playerScore.rank === 2
                                    ? "2nd"
                                    : playerScore.rank === 3
                                      ? "3rd"
                                      : `${playerScore.rank}th`}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={isWinner ? 600 : 400}>
                              {playerScore.displayName}
                              {isCurrentUser ? " (You)" : ""}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="center">
                            <Badge
                              color={isWinner ? "unoGreen" : "gray"}
                              variant="light"
                            >
                              {playerScore.cardCount}
                            </Badge>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Text
                              fw={isWinner ? 700 : 400}
                              c={isWinner ? "unoGreen.7" : undefined}
                            >
                              {isWinner ? `+${playerScore.score}` : "—"}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>
        ) : (
          // Fallback for old games without finalScores
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
                        {player.cardCount}{" "}
                        {player.cardCount === 1 ? "card" : "cards"}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        <Button
          variant="gradient"
          gradient={{ from: "unoBlue.4", to: "cyan", deg: 90 }}
          onClick={() => navigate("/dashboard")}
          size="lg"
        >
          Return to Dashboard
        </Button>
      </Stack>
    </Center>
  );
};

export default CompletedGame;
