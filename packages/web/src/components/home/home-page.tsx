import { auth } from "@/firebase";
import {
  Button,
  Card,
  Center,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { FaGamepad, FaGlassCheers, FaPlay, FaUsers } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { UNO_ICON_COLOR } from "../../theme";
import { UnoLogo } from "../common";
import LoginForm from "../login/login-form";

const HomePage = () => {
  const [uid, setUid] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    auth.authStateReady().then(() => {
      const user = auth.currentUser;
      setUid(user ? user.uid : null);
    });
  }, []);

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
          {uid ? (
            <Button
              component={Link}
              size="lg"
              leftSection={<FaPlay />}
              to="/dashboard"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan", deg: 90 }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <LoginForm />
          )}
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
      </Stack>
    </Container>
  );
};

export default HomePage;
