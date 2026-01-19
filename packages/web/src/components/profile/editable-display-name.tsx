import { profileService } from "@/service/profile-service";
import { Button, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";

interface EditableDisplayNameProps {
  displayName: string;
  userId: string;
}

const EditableDisplayName = ({
  displayName,
  userId,
}: EditableDisplayNameProps) => {
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(displayName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNewDisplayName(displayName);
  }, [displayName]);

  const handleSaveName = () => {
    if (!newDisplayName) return;
    setSubmitting(true);
    profileService
      .updateProfile(userId, { displayName: newDisplayName })
      .finally(() => {
        setSubmitting(false);
        setEditingName(false);
      });
  };

  const handleCancelName = () => {
    setNewDisplayName(displayName);
    setEditingName(false);
  };

  return editingName ? (
    <Stack gap="sm" align="center">
      <TextInput
        value={newDisplayName}
        onChange={(e) => setNewDisplayName(e.currentTarget.value)}
        onKeyDown={({ key }) => {
          if (key === "Enter") {
            handleSaveName();
          }
        }}
        disabled={submitting}
        autoFocus
      />
      <Group gap="xs">
        <Button size="xs" onClick={handleSaveName} loading={submitting}>
          Save
        </Button>
        <Button
          size="xs"
          variant="subtle"
          onClick={handleCancelName}
          disabled={submitting}
        >
          Cancel
        </Button>
      </Group>
    </Stack>
  ) : (
    <Stack gap={4} align="center">
      <Title
        order={2}
        size="h3"
        onClick={() => setEditingName(true)}
        style={{ cursor: "pointer" }}
      >
        {displayName}
      </Title>
      <Text size="xs" c="dimmed">
        Click to edit
      </Text>
    </Stack>
  );
};

export default EditableDisplayName;
