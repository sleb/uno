import type { CreateGameRequest, Game, GameData } from "@uno/shared";
import {
  QueryDocumentSnapshot,
  type FirestoreDataConverter,
} from "firebase-admin/firestore";
import { db } from "../firebase";

const gameConverter: FirestoreDataConverter<GameData, GameData> = {
  toFirestore(gameData: Game): GameData {
    return gameData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<GameData>): Game {
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  },
};

const gamesRef = () => db.collection("games").withConverter(gameConverter);

const gameRef = (gameId: string) => gamesRef().doc(gameId);

const DECK_SIZE = 108;

export const createGame = async (
  hostId: string,
  { isPrivate, houseRules, maxPlayers }: CreateGameRequest,
): Promise<string> => {
  const gameDocRef = await gamesRef().add({
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    config: {
      isPrivate,
      houseRules,
      maxPlayers,
    },
    players: [hostId],
    state: {
      status: "waiting",
      currentTurnPlayerId: null,
      direction: "clockwise",
      drawPileCount: DECK_SIZE,
      discardPile: [],
    },
    startedAt: null,
  });
  return gameDocRef.id;
};
