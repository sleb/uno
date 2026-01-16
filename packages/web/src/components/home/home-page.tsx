import {
  Button,
  Card,
  Center,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { FaGamepad, FaGlassCheers, FaPlay, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { UNO_ICON_COLOR } from "../../theme";
import { UnoLogo } from "../common";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl" mt="xl">
        {/* Hero Section */}
        <Center>
          <Stack gap="md" align="center">
            <UnoLogo />
            <Text size="xl" c="dimmed" ta="center" maw={600}>
              Play the classic card game with friends, anytime, anywhere. No
              need to wait - play at your own pace!
            </Text>
          </Stack>
        </Center>

        {/* Call to Action Buttons */}
        <Center>
          <Button
            size="lg"
            leftSection={<FaPlay />}
            onClick={() => navigate("/login")}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 90 }}
          >
            Get Started
          </Button>
        </Center>

        {/* Features Section */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="xl">
          <Card>
            <Stack gap="sm" align="center">
              <FaGamepad size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Asynchronous Play
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Play at your own pace. No need to be online at the same time as
                your opponents.
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="sm" align="center">
              <FaUsers size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Multiple Games
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Join multiple games simultaneously and switch between them
                whenever you want.
              </Text>
            </Stack>
          </Card>

          <Card>
            <Stack gap="sm" align="center">
              <FaGlassCheers size={40} color={UNO_ICON_COLOR} />
              <Title order={3} size="h4">
                Play with Friends
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Create private games or join public matches. Invite friends and
                family to play.
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* How It Works */}
        <Stack gap="md" mt="xl">
          <Title order={2} ta="center">
            How It Works
          </Title>
          <Card>
            <Stack gap="md">
              <Group gap="sm">
                <Text fw={700} c="blue" size="xl">
                  1.
                </Text>
                <Text>Create an account or sign in</Text>
              </Group>
              <Group gap="sm">
                <Text fw={700} c="blue" size="xl">
                  2.
                </Text>
                <Text>Create a new game or join an existing one</Text>
              </Group>
              <Group gap="sm">
                <Text fw={700} c="blue" size="xl">
                  3.
                </Text>
                <Text>Play your turn whenever it's convenient for you</Text>
              </Group>
              <Group gap="sm">
                <Text fw={700} c="blue" size="xl">
                  4.
                </Text>
                <Text>Get notified when it's your turn to play</Text>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Stack>
    </Container>
  );
};

export default HomePage;
