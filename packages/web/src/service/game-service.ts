import {
  type CreateGameRequest,
  CreateGameResponseSchema,
  type Game,
  type GameData,
  GameSchema,
} from "@uno/shared";
import {
  collection,
  doc,
  type FirestoreDataConverter,
  onSnapshot,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase";

const gameConverter: FirestoreDataConverter<Game, GameData> = {
  toFirestore: (game: Game): GameData => game,
  fromFirestore: (snapshot: QueryDocumentSnapshot<GameData>): Game =>
    GameSchema.parse({ id: snapshot.id, ...snapshot.data() }),
};

const gameRef = (gameId: string) =>
  doc(db, "games", gameId).withConverter(gameConverter);

const gamesRef = () => collection(db, "games").withConverter(gameConverter);

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
