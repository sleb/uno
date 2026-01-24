import {
  Avatar,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { UserDataSchema } from "@uno/shared";
import { FaUser } from "react-icons/fa";
import { PRESET_AVATARS } from "@/constants/preset-avatars";
import { useUid } from "@/hooks/uid";
import { createProfile } from "@/service/profile-service";
import { UNO_ICON_COLOR } from "@/theme";
import { notifyError } from "../notifications";

type FormValues = {
  displayName: string;
  avatar: string;
};

const CreateProfilePage = () => {
  const uid = useUid();

  const handleSubmit = (form: FormValues) => {
    createProfile(uid, UserDataSchema.parse(form)).catch(notifyError);
  };

  const { onSubmit, getInputProps, key } = useForm<FormValues>({
    initialValues: {
      displayName: "",
      avatar: "",
    },
    mode: "uncontrolled",
    validate: {
      displayName: (value) => (value.length < 3 ? "Name too short" : null),
      avatar: (value) =>
        PRESET_AVATARS.includes(value) ? null : "Select a valid avatar",
    },
  });

  return (
    <form onSubmit={onSubmit(handleSubmit)}>
      <Stack gap="xl" p="xl" align="center">
        <Title order={1} ta="center">
          Create Your Profile
        </Title>
        <Card w={300}>
          <Stack gap="lg">
            <TextInput
              key={key("displayName")}
              label={
                <Group gap="sm">
                  <FaUser color={UNO_ICON_COLOR} />
                  <Title order={3} size="h4">
                    Display Name
                  </Title>
                </Group>
              }
              {...getInputProps("displayName")}
            />
          </Stack>
        </Card>
        <Card w={300}>
          <Stack gap="lg">
            <Select
              key={key("avatar")}
              label={
                <Group gap="sm">
                  <FaUser color={UNO_ICON_COLOR} />
                  <Title order={3} size="h4">
                    Avatar
                  </Title>
                </Group>
              }
              data={PRESET_AVATARS}
              renderOption={({ option: { value }, checked }) => (
                <Avatar
                  size={30}
                  radius="xl"
                  mr="md"
                  color={checked ? UNO_ICON_COLOR : "gray"}
                >
                  <Text size="1.5rem">{value}</Text>
                </Avatar>
              )}
              {...getInputProps("avatar")}
            />
          </Stack>
        </Card>
        <Button type="submit" size="lg">
          Create Profile
        </Button>
      </Stack>
    </form>
  );
};

export default CreateProfilePage;
