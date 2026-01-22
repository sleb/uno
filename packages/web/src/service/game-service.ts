import { db, functions } from "@/firebase";
import {
  CreateGameResponseSchema,
  GameSchema,
  type CreateGameRequest,
  type Game,
  type GameData,
} from "@uno/shared";
import {
  collection,
  doc,
  QueryDocumentSnapshot,
  type FirestoreDataConverter,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

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
