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
import { useForm } from "@mantine/form";
import { HouseRuleSchema } from "@uno/shared";
import { FaGlobe, FaLock, FaPlus, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { createGame } from "../../service/game-service";
import { UNO_ICON_COLOR } from "../../theme";
import { notifyError } from "../notifications";

type FormValues = {
  isPublic: boolean;
  maxPlayers: number;
  houseRules: {
    stacking: boolean;
    drawToMatch: boolean;
  };
};

const CreateGameForm = () => {
  const navigate = useNavigate();

  const handleSubmit = async ({
    houseRules,
    isPublic,
    maxPlayers,
  }: FormValues) => {
    try {
      const gameId = await createGame({
        isPrivate: !isPublic,
        maxPlayers,
        houseRules: Object.entries(houseRules)
          .filter(([, enabled]) => enabled)
          .map(([rule]) => HouseRuleSchema.parse(rule)),
      });

      navigate(`/game/${gameId}`);
    } catch (err) {
      notifyError(err);
    }
  };

  const { onSubmit, submitting, getValues, setFieldValue, key } =
    useForm<FormValues>({
      initialValues: {
        isPublic: true,
        maxPlayers: 4,
        houseRules: {
          stacking: false,
          drawToMatch: false,
        },
      },
      mode: "uncontrolled",
    });

  const isPublic = getValues().isPublic;

  return (
    <Center>
      <form onSubmit={onSubmit(handleSubmit)}>
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
                key={key("isPublic")}
                value={isPublic.toString()}
                onChange={(v) => setFieldValue("isPublic", v === "true")}
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
              <Radio.Group
                key={key("maxPlayers")}
                value={getValues().maxPlayers.toString()}
                onChange={(v) => setFieldValue("maxPlayers", Number(v))}
              >
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
                <Switch
                  key={key("houseRules.stacking")}
                  label="Stacking (+2 and +4 cards)"
                  checked={getValues().houseRules.stacking}
                  onChange={(e) =>
                    setFieldValue(
                      "houseRules.stacking",
                      e.currentTarget.checked,
                    )
                  }
                />
                <Switch
                  key={key("houseRules.drawToMatch")}
                  label="Draw to Match (must draw until playable card)"
                  checked={getValues().houseRules.drawToMatch}
                  onChange={(e) =>
                    setFieldValue(
                      "houseRules.drawToMatch",
                      e.currentTarget.checked,
                    )
                  }
                />
              </Stack>
            </Stack>

            <Button
              type="submit"
              fullWidth
              size="lg"
              leftSection={<FaPlus />}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan", deg: 90 }}
              loading={submitting}
            >
              Create Game
            </Button>
          </Stack>
        </Card>
      </form>
    </Center>
  );
};

export default CreateGameForm;
