import { PRESET_AVATARS } from "@/constants/preset-avatars";
import { profileService } from "@/service/profile-service";
import { Avatar, Button, Group, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";

interface EditableAvatarProps {
  avatar: string;
  userId: string;
}

const EditableAvatar = ({ avatar, userId }: EditableAvatarProps) => {
  const [editing, setEditing] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(avatar);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveAvatar = () => {
    if (!selectedAvatar) return;
    setSubmitting(true);
    profileService
      .updateProfile(userId, { avatar: selectedAvatar })
      .finally(() => {
        setSubmitting(false);
        setEditing(false);
      });
  };

  const handleCancelAvatar = () => {
    setSelectedAvatar(avatar);
    setEditing(false);
  };

  return editing ? (
    <Stack gap="sm" align="center">
      <Select
        data={PRESET_AVATARS}
        value={selectedAvatar}
        onChange={(value) => setSelectedAvatar(value || avatar)}
        renderOption={({ option: { value }, checked }) => (
          <Avatar
            size={30}
            radius="xl"
            mr="md"
            color={checked ? "blue" : "gray"}
          >
            <Text size="1.5rem">{value}</Text>
          </Avatar>
        )}
        allowDeselect={false}
        searchable
        disabled={submitting}
        withCheckIcon={false}
      />
      <Group gap="xs">
        <Button size="xs" onClick={handleSaveAvatar} loading={submitting}>
          Save
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={handleCancelAvatar}
          disabled={submitting}
        >
          Cancel
        </Button>
      </Group>
    </Stack>
  ) : (
    <Stack gap={4} align="center">
      <Avatar
        size={120}
        radius="xl"
        onClick={() => setEditing(true)}
        style={{ cursor: "pointer" }}
      >
        <Text size="4rem">{avatar}</Text>
      </Avatar>
      <Text size="xs" c="dimmed">
        Click to change
      </Text>
    </Stack>
  );
};

export default EditableAvatar;
