import { UNO_ICON_COLOR } from "@/theme";
import {
  Button,
  Card,
  Center,
  Container,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { FaGamepad, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import CreateGameForm from "./create-game-form";

const LobbyPage = () => {
  const [showCreateGame, setShowCreateGame] = useState(false);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Page Header */}
        <Center>
          <Stack gap="xs" align="center">
            <Title order={1}>Game Lobby</Title>
            <Text c="dimmed" size="sm">
              Join an existing game or create your own
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

        {/* Search/Filter Section */}
        {!showCreateGame && (
          <>
            <Stack gap="md">
              <TextInput
                placeholder="Search for games or enter game code..."
                leftSection={<FaSearch color={UNO_ICON_COLOR} />}
                size="md"
              />
            </Stack>

            {/* Available Games List */}
            <Stack gap="md">
              <Title order={2}>Available Games</Title>

              {/* Empty State */}
              <Card>
                <Center py="xl">
                  <Stack gap="md" align="center">
                    <FaGamepad size={60} color={UNO_ICON_COLOR} opacity={0.3} />
                    <Text c="dimmed" ta="center">
                      No public games available
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Create a new game to get started!
                    </Text>
                  </Stack>
                </Center>
              </Card>

              {/* Example Game Cards (for when games exist) */}
              {/* <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Card>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Title order={4} size="h5">
                        Quick Game
                      </Title>
                      <Badge color="unoGreen">Open</Badge>
                    </Group>
                    <Group gap="xs">
                      <FaUsers color={UNO_ICON_COLOR} size={14} />
                      <Text size="sm">2/4 Players</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Created by PlayerName
                    </Text>
                    <Button fullWidth variant="light" size="sm">
                      Join Game
                    </Button>
                  </Stack>
                </Card>
              </SimpleGrid> */}
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
};

export default LobbyPage;
