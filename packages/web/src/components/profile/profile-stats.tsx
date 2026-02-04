import { Center, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { User } from "@uno/shared";
import {
  FaBolt,
  FaChartBar,
  FaFire,
  FaGamepad,
  FaStar,
  FaTrophy,
} from "react-icons/fa";

interface ProfileStatsProps {
  user: User;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor?: string;
}

const StatCard = ({ icon, label, value, iconColor }: StatCardProps) => (
  <Paper withBorder shadow="sm" p="md" radius="md">
    <Stack gap="xs" align="center">
      <div style={{ color: iconColor }}>{icon}</div>
      <Text size="sm" c="dimmed" ta="center">
        {label}
      </Text>
      <Text size="xl" fw={700}>
        {value}
      </Text>
    </Stack>
  </Paper>
);

const ProfileStats = ({ user }: ProfileStatsProps) => {
  const stats = user.stats ?? {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalScore: 0,
    winRate: 0,
    highestGameScore: 0,
    cardsPlayed: 0,
    specialCardsPlayed: 0,
  };

  const winRatePercent =
    stats.gamesPlayed > 0 ? `${stats.winRate.toFixed(1)}%` : "0.0%";

  const showNoGamesMessage = stats.gamesPlayed === 0;

  return (
    <Stack gap="lg">
      {/* Section Header */}
      <Center>
        <Stack gap="xs" align="center">
          <Title order={2}>Your Statistics</Title>
          <Text c="dimmed" size="sm">
            Track your UNO career and achievements
          </Text>
        </Stack>
      </Center>

      {/* No Games Message */}
      {showNoGamesMessage && (
        <Center>
          <Paper withBorder p="xl" radius="md" w={{ base: "100%", sm: 500 }}>
            <Stack gap="md" align="center">
              <FaGamepad size={60} color="#228BE6" opacity={0.3} />
              <Text c="dimmed" ta="center" fw={500}>
                No games played yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Join or create a game to start tracking your stats!
              </Text>
            </Stack>
          </Paper>
        </Center>
      )}

      {/* Stats Grid */}
      {!showNoGamesMessage && (
        <SimpleGrid
          cols={{ base: 2, xs: 2, sm: 4 }}
          spacing={{ base: "sm", sm: "lg" }}
        >
          <StatCard
            icon={<FaGamepad size={32} />}
            label="Games Played"
            value={stats.gamesPlayed}
            iconColor="#228BE6"
          />
          <StatCard
            icon={<FaTrophy size={32} />}
            label="Wins"
            value={stats.gamesWon}
            iconColor="#FFD700"
          />
          <StatCard
            icon={<FaChartBar size={32} />}
            label="Win Rate"
            value={winRatePercent}
            iconColor="#40C057"
          />
          <StatCard
            icon={<FaStar size={32} />}
            label="Highest Score"
            value={stats.highestGameScore}
            iconColor="#FD7E14"
          />
          <StatCard
            icon={<FaFire size={32} />}
            label="Total Score"
            value={stats.totalScore.toLocaleString()}
            iconColor="#FA5252"
          />
          <StatCard
            icon={<FaBolt size={32} />}
            label="Cards Played"
            value={stats.cardsPlayed.toLocaleString()}
            iconColor="#BE4BDB"
          />
          <StatCard
            icon={<FaBolt size={32} />}
            label="Special Cards"
            value={stats.specialCardsPlayed.toLocaleString()}
            iconColor="#7950F2"
          />
          <StatCard
            icon={<FaGamepad size={32} />}
            label="Losses"
            value={stats.gamesLost}
            iconColor="#868E96"
          />
        </SimpleGrid>
      )}
    </Stack>
  );
};

export default ProfileStats;
