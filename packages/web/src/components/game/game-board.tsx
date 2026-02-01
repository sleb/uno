import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { Game, GamePlayer, PlayerHand, Card as UnoCard } from "@uno/shared";
import { useEffect, useState } from "react";
import { FaArrowRight, FaHandPaper, FaRedo, FaUndo } from "react-icons/fa";
import { onGamePlayersUpdate, onPlayerHandUpdate } from "../../service/game-service";

interface GameBoardProps {
  game: Game;
  currentUserId: string;
}

const GameBoard = ({ game, currentUserId }: GameBoardProps) => {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [myHand, setMyHand] = useState<PlayerHand | null>(null);

  useEffect(() => {
    return onGamePlayersUpdate(game.id, setPlayers);
  }, [game.id]);

  useEffect(() => {
    return onPlayerHandUpdate(game.id, currentUserId, setMyHand);
  }, [game.id, currentUserId]);

  const isMyTurn = game.state.currentTurnPlayerId === currentUserId;
  const currentPlayer = players.find((p) => p.id === game.state.currentTurnPlayerId);
  const topCard = game.state.discardPile[game.state.discardPile.length - 1];

  return (
    <Box p="md">
      <Stack gap="xl" maw={1200} mx="auto">
        {/* Game Header */}
        <Group justify="space-between" align="center">
          <Title order={2}>Uno Game</Title>
          <Badge
            size="lg"
            variant="gradient"
            gradient={{ from: isMyTurn ? "unoGreen.5" : "gray", to: isMyTurn ? "green" : "gray.6", deg: 90 }}
          >
            {isMyTurn ? "Your Turn" : `${currentPlayer?.displayName || "..."}'s Turn`}
          </Badge>
        </Group>

        {/* Other Players */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <Text fw={600} size="lg">
                Players
              </Text>
              <Group gap="xs" ml="auto">
                {game.state.direction === "clockwise" ? (
                  <FaRedo size={16} />
                ) : (
                  <FaUndo size={16} />
                )}
                <Text size="sm" c="dimmed">
                  {game.state.direction === "clockwise" ? "Clockwise" : "Counter-clockwise"}
                </Text>
              </Group>
            </Group>

            <Grid>
              {players.map((player) => {
                const isCurrent = player.id === game.state.currentTurnPlayerId;
                const isMe = player.id === currentUserId;
                return (
                  <Grid.Col key={player.id} span={{ base: 12, xs: 6, sm: 4, md: 3 }}>
                    <Paper
                      withBorder
                      p="md"
                      radius="md"
                      bg={isCurrent ? "unoBlue.0" : undefined}
                      style={{
                        borderColor: isCurrent ? "var(--mantine-color-unoBlue-4)" : undefined,
                        borderWidth: isCurrent ? 2 : 1,
                      }}
                    >
                      <Stack gap="xs">
                        <Group gap="xs" justify="space-between">
                          <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
                            {player.displayName}
                            {isMe && " (You)"}
                          </Text>
                          {isCurrent && <FaArrowRight size={14} />}
                        </Group>
                        <Group gap="xs">
                          <FaHandPaper size={16} />
                          <Text size="sm" c="dimmed">
                            {player.cardCount} {player.cardCount === 1 ? "card" : "cards"}
                          </Text>
                        </Group>
                        {player.hasCalledUno && (
                          <Badge size="sm" color="unoRed" variant="filled">
                            UNO!
                          </Badge>
                        )}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Stack>
        </Card>

        {/* Game Table */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="lg">
            <Group justify="center" align="center" gap="xl">
              {/* Draw Pile */}
              <Stack gap="xs" align="center">
                <Text size="sm" c="dimmed" fw={500}>
                  Draw Pile
                </Text>
                <Box
                  w={100}
                  h={140}
                  bg="gray.3"
                  style={{
                    borderRadius: 8,
                    border: "2px solid var(--mantine-color-gray-5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text size="xl" fw={700} c="gray.7">
                    {game.state.drawPileCount}
                  </Text>
                </Box>
              </Stack>

              {/* Discard Pile */}
              <Stack gap="xs" align="center">
                <Text size="sm" c="dimmed" fw={500}>
                  Discard Pile
                </Text>
                {topCard ? (
                  <UnoCardDisplay card={topCard} />
                ) : (
                  <Box
                    w={100}
                    h={140}
                    bg="gray.1"
                    style={{
                      borderRadius: 8,
                      border: "2px dashed var(--mantine-color-gray-4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text size="sm" c="dimmed">
                      Empty
                    </Text>
                  </Box>
                )}
              </Stack>
            </Group>

            {/* Actions */}
            {isMyTurn && (
              <Group justify="center" gap="md">
                <Button variant="outline" color="gray" disabled>
                  Draw Card
                </Button>
                <Button variant="gradient" gradient={{ from: "unoRed.5", to: "red", deg: 90 }} disabled>
                  Play Card
                </Button>
                <Button variant="outline" color="unoYellow" disabled>
                  Call UNO
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        {/* My Hand */}
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Stack gap="md">
            <Text fw={600} size="lg">
              Your Hand
            </Text>
            {myHand && myHand.hand.length > 0 ? (
              <Group gap="sm" justify="center">
                {myHand.hand.map((card, index) => (
                  <UnoCardDisplay key={`${card.kind}-${card.value}-${index}`} card={card} clickable />
                ))}
              </Group>
            ) : (
              <Center py="xl">
                <Text c="dimmed">No cards in hand</Text>
              </Center>
            )}
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
};

interface UnoCardDisplayProps {
  card: UnoCard;
  clickable?: boolean;
}

const UnoCardDisplay = ({ card, clickable }: UnoCardDisplayProps) => {
  const isWild = card.value === "wild" || card.value === "wild_draw4";
  const color: "red" | "yellow" | "green" | "blue" | "gray" = isWild
    ? "gray"
    : "color" in card
      ? card.color
      : "gray";

  const colorMap = {
    red: "unoRed.6",
    yellow: "unoYellow.6",
    green: "unoGreen.6",
    blue: "unoBlue.6",
    gray: "gray.8",
  };

  const bgColor = colorMap[color];

  return (
    <Box
      w={80}
      h={110}
      bg={bgColor}
      style={{
        borderRadius: 8,
        border: "3px solid white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: clickable ? "pointer" : "default",
        transition: "transform 0.1s",
        ...(clickable && {
          ":hover": {
            transform: "translateY(-4px)",
          },
        }),
      }}
    >
      <Text size="xl" fw={700} c="white" ta="center">
        {card.value === "wild_draw4"
          ? "+4"
          : card.value === "wild"
            ? "W"
            : card.value === "draw2"
              ? "+2"
              : card.value === "skip"
                ? "⊘"
                : card.value === "reverse"
                  ? "⇄"
                  : card.value}
      </Text>
    </Box>
  );
};

export default GameBoard;
