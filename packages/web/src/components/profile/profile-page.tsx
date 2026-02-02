import { Card, Center, Divider, Stack, Text, Title } from "@mantine/core";
import { useUser } from "../../hooks/user";
import EditableAvatar from "./editable-avatar";
import EditableDisplayName from "./editable-display-name";
import ProfileStats from "./profile-stats";

const ProfilePage = () => {
  const user = useUser();
  const { displayName, avatar, id } = user;

  return (
    <Stack gap="xl" py="xl">
      {/* Page Header */}
      <Center>
        <Stack gap="xs" align="center">
          <Title order={1}>Profile Settings</Title>
          <Text c="dimmed" size="sm">
            Customize your display name and avatar
          </Text>
        </Stack>
      </Center>

      {/* Profile Preview Card */}
      <Center>
        <Card w={{ base: "100%", sm: 400 }}>
          <Stack gap="lg" align="center">
            <EditableAvatar avatar={avatar} userId={id} />
            <EditableDisplayName displayName={displayName} userId={id} />
            <Text size="sm" c="dimmed">
              UID: {id.slice(0, 8)}...
            </Text>
          </Stack>
        </Card>
      </Center>

      {/* Divider */}
      <Divider my="lg" />

      {/* Statistics Section */}
      <ProfileStats user={user} />
    </Stack>
  );
};

export default ProfilePage;
