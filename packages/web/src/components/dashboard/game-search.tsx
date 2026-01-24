import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { FaSearch, FaSignInAlt, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { joinGame } from "@/service/game-service";
import { UNO_ICON_COLOR } from "@/theme";

interface GameSearchProps {
  onSearchChange: (query: string) => void;
}

const GameSearch = ({ onSearchChange }: GameSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setError(null);
    onSearchChange(value);
  };

  const handleClear = () => {
    setSearchQuery("");
    setError(null);
    onSearchChange("");
  };

  const handleJoinGame = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a game code");
      return;
    }

    setJoining(true);
    setError(null);

    try {
      await joinGame(searchQuery.trim());
      // Navigate to the game page after successfully joining
      navigate(`/game/${searchQuery.trim()}`);
    } catch (err: unknown) {
      console.error("Failed to join game:", err);

      // Handle Firebase Functions error codes
      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code: string }).code
          : "";
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "";

      if (
        errorCode === "functions/not-found" ||
        errorMessage.includes("not found")
      ) {
        setError("Game not found. Please check the game code.");
      } else if (errorCode === "functions/failed-precondition") {
        if (errorMessage.includes("full")) {
          setError("This game is full.");
        } else if (
          errorMessage.includes("started") ||
          errorMessage.includes("completed")
        ) {
          setError("This game has already started or ended.");
        } else {
          setError("Cannot join this game at this time.");
        }
      } else if (errorMessage.includes("already a player")) {
        // User is already in the game, just navigate
        navigate(`/game/${searchQuery.trim()}`);
      } else {
        setError("Failed to join game. Please try again.");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleJoinGame();
    }
  };

  return (
    <Stack gap="md">
      <TextInput
        placeholder="Search your games or enter game code to join..."
        leftSection={<FaSearch color={UNO_ICON_COLOR} />}
        rightSection={
          searchQuery && (
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={handleClear}
              disabled={joining}
            >
              <FaTimes />
            </ActionIcon>
          )
        }
        size="md"
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.currentTarget.value)}
        onKeyPress={handleKeyPress}
        error={error}
        disabled={joining}
      />

      {searchQuery.trim() && (
        <Card withBorder>
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                Join game with code: {searchQuery.trim()}
              </Text>
              <Text size="xs" c="dimmed">
                Click "Join Game" to enter this game
              </Text>
            </Stack>
            <Button
              leftSection={
                joining ? <Loader size="xs" /> : <FaSignInAlt size={14} />
              }
              onClick={handleJoinGame}
              loading={joining}
              disabled={joining}
            >
              Join Game
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  );
};

export default GameSearch;
