import type { Game } from "@uno/shared";
import { useEffect, useState } from "react";
import { useUid } from "@/hooks/uid";
import { onUserGamesUpdate } from "@/service/game-service";

export const useUserGames = () => {
  const uid = useUid();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onUserGamesUpdate(uid, (updatedGames) => {
      setGames(updatedGames);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [uid]);

  return { games, loading, error };
};
