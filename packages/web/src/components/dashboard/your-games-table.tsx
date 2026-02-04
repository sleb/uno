import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import { FaEye, FaGamepad, FaSearch, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useUserGames } from "../../hooks/user-games";
import { UNO_ICON_COLOR } from "../../theme";

interface YourGamesTableProps {
  searchQuery?: string;
}

const YourGamesTable = ({ searchQuery = "" }: YourGamesTableProps) => {
  const { games, loading } = useUserGames();
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);

  // Filter games based on completion status and search query
  const filteredGames = games
    .filter((game) => {
      // Filter by completion status
      if (!showCompleted && game.state.status === "completed") {
        return false;
      }
      return true;
    })
    .filter((game) => {
      // Filter by search query
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      return (
        game.id.toLowerCase().includes(query) ||
        game.state.status.toLowerCase().includes(query)
      );
    });

  if (loading) {
    return (
      <Card>
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Card>
    );
  }

  if (games.length === 0) {
    return (
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
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return (
          <Badge color="blue" variant="light">
            Waiting
          </Badge>
        );
      case "in-progress":
        return (
          <Badge color="green" variant="light">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge color="gray" variant="light">
            Completed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (filteredGames.length === 0 && searchQuery) {
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Your Games</Title>
          <Switch
            label="Show completed"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.currentTarget.checked)}
          />
        </Group>
        <Card>
          <Center py="xl">
            <Stack gap="md" align="center">
              <FaSearch size={60} color={UNO_ICON_COLOR} opacity={0.3} />
              <Text c="dimmed" ta="center">
                No games match "{searchQuery}"
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Try a different search term or game code
              </Text>
            </Stack>
          </Center>
        </Card>
      </Stack>
    );
  }

  if (filteredGames.length === 0 && !showCompleted) {
    return (
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Your Games</Title>
          <Switch
            label="Show completed"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.currentTarget.checked)}
          />
        </Group>
        <Card>
          <Center py="xl">
            <Stack gap="md" align="center">
              <FaGamepad size={60} color={UNO_ICON_COLOR} opacity={0.3} />
              <Text c="dimmed" ta="center">
                No active games
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                All your games are completed. Toggle "Show completed" to see
                them.
              </Text>
            </Stack>
          </Center>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Your Games</Title>
        <Switch
          label="Show completed"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.currentTarget.checked)}
        />
      </Group>

      {/* Mobile Card View */}
      <Box hiddenFrom="sm">
        <Stack gap="md">
          {filteredGames.map((game) => (
            <Card key={game.id} withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="xs" fw={500} ff="monospace" c="dimmed">
                    {game.id.slice(0, 8)}...
                  </Text>
                  {getStatusBadge(game.state.status)}
                </Group>
                <Group justify="space-between">
                  <Group gap="xs">
                    <FaUsers size={14} color={UNO_ICON_COLOR} />
                    <Text size="sm">
                      {game.players.length}/{game.config.maxPlayers}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {formatDate(game.lastActivityAt)}
                  </Text>
                </Group>
                <Button
                  fullWidth
                  variant="light"
                  leftSection={<FaEye size={14} />}
                  onClick={() => navigate(`/game/${game.id}`)}
                >
                  View Game
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* Desktop Table View */}
      <Card visibleFrom="sm">
        <Stack gap="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Game ID</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Players</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Last Activity</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredGames.map((game) => (
                <Table.Tr key={game.id}>
                  <Table.Td>
                    <Text size="sm" fw={500} ff="monospace">
                      {game.id.slice(0, 8)}...
                    </Text>
                  </Table.Td>
                  <Table.Td>{getStatusBadge(game.state.status)}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <FaUsers size={14} color={UNO_ICON_COLOR} />
                      <Text size="sm">
                        {game.players.length}/{game.config.maxPlayers}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(game.createdAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(game.lastActivityAt)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label="View game">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => navigate(`/game/${game.id}`)}
                      >
                        <FaEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );
};

export default YourGamesTable;
