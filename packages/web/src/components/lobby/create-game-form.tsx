import { UNO_ICON_COLOR } from "@/theme";
import {
  Button,
  Card,
  Center,
  Divider,
  Group,
  Radio,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { FaGlobe, FaLock, FaPlus, FaUsers } from "react-icons/fa";

const CreateGameForm = () => {
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState("4");

  const handleCreateGame = () => {
    // TODO: Implement game creation logic
    console.log("Creating game...", { isPublic, maxPlayers });
  };

  return (
    <Center>
      <Card w={{ base: "100%", sm: 500 }}>
        <Stack gap="lg">
          <Title order={3} size="h4">
            Game Settings
          </Title>

          {/* Public/Private Toggle */}
          <Stack gap="xs">
            <Group gap="sm">
              {isPublic ? (
                <FaGlobe color={UNO_ICON_COLOR} />
              ) : (
                <FaLock color={UNO_ICON_COLOR} />
              )}
              <Text fw={500}>Game Type</Text>
            </Group>
            <Radio.Group
              value={isPublic.toString()}
              onChange={(v) => setIsPublic(v === "true")}
            >
              <Stack gap="xs">
                <Radio value="true" label="Public - Anyone can join" />
                <Radio value="false" label="Private - Invite only" />
              </Stack>
            </Radio.Group>
          </Stack>

          {/* Number of Players */}
          <Stack gap="xs">
            <Group gap="sm">
              <FaUsers color={UNO_ICON_COLOR} />
              <Text fw={500}>Maximum Players</Text>
            </Group>
            <Radio.Group value={maxPlayers} onChange={setMaxPlayers}>
              <Group gap="md">
                <Radio value="2" label="2 Players" />
                <Radio value="3" label="3 Players" />
                <Radio value="4" label="4 Players" />
              </Group>
            </Radio.Group>
          </Stack>

          <Divider />

          {/* House Rules */}
          <Stack gap="md">
            <Text fw={500}>House Rules</Text>
            <Stack gap="sm">
              <Switch label="Stacking (+2 and +4 cards)" />
              <Switch label="Jump In (play identical card out of turn)" />
              <Switch label="Seven Swap (playing 7 swaps hands)" />
              <Switch label="Zero Rotation (playing 0 rotates hands)" />
              <Switch label="Draw to Match (must draw until playable card)" />
            </Stack>
          </Stack>

          <Button
            fullWidth
            size="lg"
            leftSection={<FaPlus />}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 90 }}
            onClick={handleCreateGame}
          >
            Create Game
          </Button>
        </Stack>
      </Card>
    </Center>
  );
};

export default CreateGameForm;
