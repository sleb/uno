import { Code, Text } from "@mantine/core";
import type { Game } from "@uno/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { onGameUpdate } from "@/service/game-service";

const GamePage = () => {
  const { gameId } = useParams<{ gameId: string }>();

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
    return <Text>Loading game...</Text>;
  }

  if (!game) {
    return <Text>Game not found for gameId: {gameId}</Text>;
  }

  return <Code block>{JSON.stringify(game, null, 2)}</Code>;
};

export default GamePage;
