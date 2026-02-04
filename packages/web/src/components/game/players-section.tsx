import {
  Avatar,
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import type { Game, GamePlayer } from "@uno/shared";
import { useEffect, useState } from "react";
import { FaUsers } from "react-icons/fa";
import { onGamePlayersUpdate } from "../../service/game-service";

interface PlayersSectionProps {
  game: Game;
  currentUserId: string;
}

const PlayersSection = ({ game, currentUserId }: PlayersSectionProps) => {
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onGamePlayersUpdate(game.id, (updatedPlayers) => {
      // Sort by the order in game.players array
      const playerMap = new Map(updatedPlayers.map((p) => [p.userId, p]));
      const sorted = game.players
        .map((userId) => playerMap.get(userId))
        .filter((p): p is GamePlayer => p !== undefined);
      setPlayers(sorted);
      setLoading(false);
    });

    return unsubscribe;
  }, [game.id, game.players]);

  return (
    <Card withBorder shadow="sm" radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <FaUsers size={20} style={{ color: "#2ecc71" }} />
            <Text fw={600} size="lg">
              Players
            </Text>
          </Group>
          <Badge variant="light" color="unoGreen">
            {game.players.length} / {game.config.maxPlayers}
          </Badge>
        </Group>

        <Divider />

        <Stack gap="xs">
          {loading ? (
            <Text c="dimmed" size="sm">
              Loading players...
            </Text>
          ) : (
            <>
              {players.map((player, index) => (
                <Paper key={player.id} withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Badge
                        variant="filled"
                        color="gray"
                        size="lg"
                        circle
                        style={{ minWidth: 32 }}
                      >
                        {index + 1}
                      </Badge>
                      <Avatar size="md" radius="xl">
                        {player.avatar}
                      </Avatar>
                      <Box>
                        <Text fw={500}>
                          {player.userId === currentUserId
                            ? `${player.displayName} (You)`
                            : player.displayName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Joined{" "}
                          {new Date(player.joinedAt).toLocaleTimeString()}
                        </Text>
                      </Box>
                    </Group>
                    <Badge color="green" variant="dot">
                      Ready
                    </Badge>
                  </Group>
                </Paper>
              ))}

              {/* Empty slots */}
              {Array.from({
                length: game.config.maxPlayers - game.players.length,
              }).map((_, index) => (
                <Paper
                  key={`empty-slot-${game.players.length}-${index}`}
                  withBorder
                  p="md"
                  radius="md"
                  bg="gray.0"
                >
                  <Group>
                    <Badge
                      variant="outline"
                      color="gray"
                      size="lg"
                      circle
                      style={{ minWidth: 32 }}
                    >
                      {game.players.length + index + 1}
                    </Badge>
                    <Text c="dimmed" fs="italic">
                      Waiting for player...
                    </Text>
                  </Group>
                </Paper>
              ))}
            </>
          )}
        </Stack>
      </Stack>
    </Card>
  );
};

export default PlayersSection;
