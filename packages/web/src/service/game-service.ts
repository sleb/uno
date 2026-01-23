import {
  type CreateGameRequest,
  CreateGameResponseSchema,
  type Game,
  type GameData,
  type GamePlayer,
  type GamePlayerData,
  GamePlayerSchema,
  GameSchema,
} from "@uno/shared";
import {
  type CollectionReference,
  collection,
  doc,
  type FirestoreDataConverter,
  onSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore/lite";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase";

const gameConverter: FirestoreDataConverter<Game, GameData> = {
  toFirestore: (game: Game): GameData => game,
  fromFirestore: (snapshot: QueryDocumentSnapshot<GameData>): Game =>
    GameSchema.parse({ id: snapshot.id, ...snapshot.data() }),
};

const gamePlayerConverter: FirestoreDataConverter<GamePlayer, GamePlayerData> =
  {
    toFirestore: (player: GamePlayer): GamePlayerData => player,
    fromFirestore: (
      snapshot: QueryDocumentSnapshot<GamePlayerData>,
    ): GamePlayer =>
      GamePlayerSchema.parse({ id: snapshot.id, ...snapshot.data() }),
  };

const gamesRef = () => collection(db, "games").withConverter(gameConverter);
const gameRef = (gameId: string) => doc(gamesRef(), gameId);

const gamePlayersRef = (gameId: string) =>
  collection(gameRef(gameId), "players").withConverter(gamePlayerConverter);

const createGameFunction = httpsCallable(functions, "createGame");
export const createGame = async (
  request: CreateGameRequest,
): Promise<string> => {
  const response = await createGameFunction(request);
  const { gameId } = CreateGameResponseSchema.parse(response.data);
  return gameId;
};

export const onGameUpdate = (
  gameId: string,
  onUpdate: (game: Game) => void,
): (() => void) => {
  return onSnapshot(gameRef(gameId), (snapshot) => {
    if (!snapshot.exists()) {
      throw new Error(`Game ${gameId} not found`);
    }
    const game = snapshot.data();
    onUpdate(game);
  });
};

export const onGamePlayersUpdate = (
  gameId: string,
  onUpdate: (players: GamePlayer[]) => void,
): (() => void) => {
  return onSnapshot(gamePlayersRef(gameId), (snapshot) => {
    const players = snapshot.docs.map((doc) => doc.data());
    onUpdate(players);
  });
};
