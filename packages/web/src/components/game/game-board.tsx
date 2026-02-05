import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  type Color,
  type Game,
  type GamePlayer,
  PlayCardRequestSchema,
  type PlayerHand,
  type Card as UnoCard,
} from "@uno/shared";
import { useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaHandPaper, FaRedo, FaUndo } from "react-icons/fa";
import {
  callUno,
  drawCard,
  onGamePlayersUpdate,
  onPlayerHandUpdate,
  playCard,
} from "../../service/game-service";
import { notifyError, notifyInfo, notifySuccess } from "../notifications";

interface GameBoardProps {
  game: Game;
  currentUserId: string;
}

const GameBoard = ({ game, currentUserId }: GameBoardProps) => {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [myHand, setMyHand] = useState<PlayerHand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wildCardIndex, setWildCardIndex] = useState<number | null>(null);
  const [wildPickerOpened, wildPickerHandlers] = useDisclosure(false);

  useEffect(() => {
    return onGamePlayersUpdate(game.id, (updatedPlayers) => {
      const playerMap = new Map(
        updatedPlayers.map((player) => [player.id, player]),
      );
      const sortedPlayers = game.players
        .map((playerId) => playerMap.get(playerId))
        .filter((player): player is GamePlayer => player !== undefined);
      setPlayers(sortedPlayers);
    });
  }, [game.id, game.players]);

  useEffect(() => {
    return onPlayerHandUpdate(game.id, currentUserId, setMyHand);
  }, [game.id, currentUserId]);

  const isMyTurn = game.state.currentTurnPlayerId === currentUserId;
  const currentPlayer = players.find(
    (p) => p.id === game.state.currentTurnPlayerId,
  );
  const myPlayer = players.find((player) => player.id === currentUserId);
  const topCard = game.state.discardPile[game.state.discardPile.length - 1];
  const activeColor = useMemo(() => {
    if (game.state.currentColor) {
      return game.state.currentColor;
    }
    if (!topCard || topCard.kind === "wild") {
      return null;
    }
    return topCard.color;
  }, [game.state.currentColor, topCard]);
  const canCallUno = players.some((player) => player.mustCallUno);
  const isDrawRequired = game.state.mustDraw > 0;
  const drawLabel = isDrawRequired
    ? `Draw ${game.state.mustDraw}`
    : "Draw Card";

  const isDrawCard = (card: UnoCard) =>
    (card.kind === "special" && card.value === "draw2") ||
    (card.kind === "wild" && card.value === "wild_draw4");

  const isPlayable = (card: UnoCard) => {
    if (!isMyTurn || !topCard) {
      return false;
    }
    if (game.state.mustDraw > 0 && !isDrawCard(card)) {
      return false;
    }
    if (card.kind === "wild") {
      return true;
    }
    if (activeColor && "color" in card && card.color === activeColor) {
      return true;
    }
    return card.value === topCard.value;
  };

  const closeWildPicker = () => {
    wildPickerHandlers.close();
    setWildCardIndex(null);
  };

  const handlePlayCard = async (cardIndex: number, chosenColor?: Color) => {
    setIsProcessing(true);
    try {
      const request = PlayCardRequestSchema.parse({
        gameId: game.id,
        cardIndex,
        ...(chosenColor !== undefined && { chosenColor }),
      });
      await playCard(request);
    } catch (error) {
      notifyError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardClick = (card: UnoCard, index: number) => {
    if (!isMyTurn || isProcessing) {
      return;
    }
    if (!isPlayable(card)) {
      notifyInfo({ message: "That card can't be played right now." });
      return;
    }
    if (card.kind === "wild") {
      setWildCardIndex(index);
      wildPickerHandlers.open();
      return;
    }
    void handlePlayCard(index);
  };

  const handleDrawCard = async () => {
    if (!isMyTurn || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      await drawCard({ gameId: game.id, count: 1 });
    } catch (error) {
      notifyError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallUno = async () => {
    if (isProcessing || !canCallUno) {
      return;
    }
    setIsProcessing(true);
    try {
      const result = await callUno({ gameId: game.id });
      if (result.caughtPlayerId) {
        const caughtPlayer = players.find(
          (player) => player.id === result.caughtPlayerId,
        );
        notifySuccess({
          message: caughtPlayer
            ? `${caughtPlayer.displayName} drew 2 cards for missing UNO.`
            : "Caught a player without UNO.",
        });
      } else {
        notifySuccess({ message: "UNO called!" });
      }
    } catch (error) {
      notifyError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChooseColor = (color: Color) => {
    if (wildCardIndex === null) {
      return;
    }
    closeWildPicker();
    void handlePlayCard(wildCardIndex, color);
  };

  return (
    <Box p="md">
      <Stack gap="xl" maw={1200} mx="auto">
        <Modal
          opened={wildPickerOpened}
          onClose={closeWildPicker}
          title="Choose a color"
          centered
        >
          <SimpleGrid cols={2}>
            <Button color="unoRed" onClick={() => handleChooseColor("red")}>
              Red
            </Button>
            <Button
              color="unoYellow"
              onClick={() => handleChooseColor("yellow")}
            >
              Yellow
            </Button>
            <Button color="unoGreen" onClick={() => handleChooseColor("green")}>
              Green
            </Button>
            <Button color="unoBlue" onClick={() => handleChooseColor("blue")}>
              Blue
            </Button>
          </SimpleGrid>
        </Modal>
        {/* Game Header */}
        <Group justify="space-between" align="center">
          <Title order={2}>Uno Game</Title>
          <Badge
            size="lg"
            variant="gradient"
            gradient={{
              from: isMyTurn ? "unoGreen.5" : "gray",
              to: isMyTurn ? "green" : "gray.6",
              deg: 90,
            }}
            data-testid="game-status"
          >
            {isMyTurn
              ? "Your Turn"
              : `${currentPlayer?.displayName || "..."}'s Turn`}
          </Badge>
          <div
            data-testid="is-my-turn"
            data-value={isMyTurn.toString()}
            style={{ display: "none" }}
          />
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
                  {game.state.direction === "clockwise"
                    ? "Clockwise"
                    : "Counter-clockwise"}
                </Text>
              </Group>
            </Group>

            <Grid>
              {players.map((player) => {
                const isCurrent = player.id === game.state.currentTurnPlayerId;
                const isMe = player.id === currentUserId;
                return (
                  <Grid.Col
                    key={player.id}
                    span={{ base: 12, xs: 6, sm: 4, md: 3 }}
                  >
                    <Paper
                      withBorder
                      p="md"
                      radius="md"
                      bg={isCurrent ? "unoBlue.0" : undefined}
                      style={{
                        borderColor: isCurrent
                          ? "var(--mantine-color-unoBlue-4)"
                          : undefined,
                        borderWidth: isCurrent ? 2 : 1,
                      }}
                      data-testid={
                        isMe ? "player-status" : `opponent-${player.id}-status`
                      }
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
                          <Text
                            size="sm"
                            c="dimmed"
                            data-testid={
                              isMe
                                ? "player-hand-count"
                                : `opponent-${player.id}-card-count`
                            }
                          >
                            {player.cardCount}{" "}
                            {player.cardCount === 1 ? "card" : "cards"}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          {player.mustCallUno && (
                            <Badge size="sm" color="unoYellow" variant="filled">
                              Call UNO
                            </Badge>
                          )}
                          {player.hasCalledUno && (
                            <Badge size="sm" color="unoRed" variant="filled">
                              UNO!
                            </Badge>
                          )}
                        </Group>
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
                  data-testid="draw-pile"
                >
                  <Text size="xl" fw={700} c="gray.7">
                    {game.state.drawPileCount}
                  </Text>
                </Box>
              </Stack>

              {/* Discard Pile */}
              <Stack gap="xs" align="center" data-testid="discard-pile">
                <Text size="sm" c="dimmed" fw={500}>
                  Discard Pile
                </Text>
                {topCard ? (
                  <Stack gap="xs" align="center">
                    <UnoCardDisplay card={topCard} />
                    <div
                      data-testid="top-card-color"
                      style={{ display: "none" }}
                    >
                      {"color" in topCard ? topCard.color : "wild"}
                    </div>
                    <div
                      data-testid="top-card-value"
                      style={{ display: "none" }}
                    >
                      {topCard.value}
                    </div>
                    {activeColor && (
                      <Badge
                        size="sm"
                        color={
                          {
                            red: "unoRed",
                            yellow: "unoYellow",
                            green: "unoGreen",
                            blue: "unoBlue",
                          }[activeColor]
                        }
                        variant="filled"
                      >
                        {activeColor.toUpperCase()}
                      </Badge>
                    )}
                  </Stack>
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
            <Stack align="center" gap="xs">
              <Group justify="center" gap="md">
                <Button
                  variant="outline"
                  color="gray"
                  onClick={handleDrawCard}
                  disabled={!isMyTurn || isProcessing}
                  loading={isProcessing && isMyTurn}
                  data-testid="draw-pile-button"
                >
                  {drawLabel}
                </Button>
                <Button
                  variant="outline"
                  color="unoYellow"
                  onClick={handleCallUno}
                  disabled={!canCallUno || isProcessing}
                  loading={isProcessing && canCallUno}
                >
                  Call UNO
                </Button>
              </Group>
              {isMyTurn ? (
                <Text size="sm" c="dimmed">
                  Select a playable card to play.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Waiting for your turn to play.
                </Text>
              )}
              {myPlayer?.mustCallUno && (
                <Badge color="unoYellow" variant="filled">
                  You must call UNO
                </Badge>
              )}
            </Stack>
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
                  <UnoCardDisplay
                    key={`${card.kind}-${card.value}-${index}`}
                    card={card}
                    clickable
                    playable={isPlayable(card)}
                    onClick={() => handleCardClick(card, index)}
                    testId={`hand-card-${index}`}
                  />
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
  playable?: boolean;
  onClick?: () => void;
  testId?: string;
}

const UnoCardDisplay = ({
  card,
  clickable,
  playable,
  onClick,
  testId,
}: UnoCardDisplayProps) => {
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
  const isInteractive = Boolean(clickable && playable);
  const boxShadow = playable
    ? "0 0 0 3px var(--mantine-color-unoYellow-4), 0 2px 4px rgba(0,0,0,0.2)"
    : "0 2px 4px rgba(0,0,0,0.2)";

  return (
    <Box
      w={80}
      h={110}
      bg={bgColor}
      onClick={onClick}
      data-testid={testId}
      data-playable={playable?.toString()}
      style={{
        borderRadius: 8,
        border: "3px solid white",
        boxShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: clickable
          ? isInteractive
            ? "pointer"
            : "not-allowed"
          : "default",
        transition: "transform 0.1s",
        opacity: clickable && !playable ? 0.5 : 1,
        ...(isInteractive && {
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
