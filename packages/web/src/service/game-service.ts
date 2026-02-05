import {
  type CallUnoRequest,
  CallUnoResponseSchema,
  type CreateGameRequest,
  CreateGameResponseSchema,
  type DrawCardRequest,
  DrawCardResponseSchema,
  type Game,
  type GameData,
  type GamePlayer,
  type GamePlayerData,
  GamePlayerSchema,
  GameSchema,
  type PassTurnRequest,
  type PlayCardRequest,
  PlayCardResponseSchema,
  type PlayerHand,
  type PlayerHandData,
  PlayerHandSchema,
} from "@uno/shared";
import {
  collection,
  doc,
  type FirestoreDataConverter,
  getDoc,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";

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

const playerHandConverter: FirestoreDataConverter<PlayerHand, PlayerHandData> =
  {
    toFirestore: (hand: PlayerHand): PlayerHandData => hand,
    fromFirestore: (
      snapshot: QueryDocumentSnapshot<PlayerHandData>,
    ): PlayerHand =>
      PlayerHandSchema.parse({ id: snapshot.id, ...snapshot.data() }),
  };

const gamesRef = () => collection(db, "games").withConverter(gameConverter);
const gameRef = (gameId: string) => doc(gamesRef(), gameId);

const gamePlayersRef = (gameId: string) =>
  collection(gameRef(gameId), "players").withConverter(gamePlayerConverter);

const playerHandsRef = (gameId: string) =>
  collection(gameRef(gameId), "playerHands").withConverter(playerHandConverter);

const createGameFunction = httpsCallable(functions, "createGame");
export const createGame = async (
  request: CreateGameRequest,
): Promise<string> => {
  const response = await createGameFunction(request);
  const { gameId } = CreateGameResponseSchema.parse(response.data);
  return gameId;
};

const joinGameFunction = httpsCallable(functions, "joinGame");
export const joinGame = async (gameId: string): Promise<void> => {
  await joinGameFunction({ gameId });
};

const startGameFunction = httpsCallable(functions, "startGame");
export const startGame = async (gameId: string): Promise<void> => {
  await startGameFunction({ gameId });
};

const playCardFunction = httpsCallable(functions, "playCard");
export const playCard = async (
  request: PlayCardRequest,
): Promise<{ winner?: string }> => {
  const response = await playCardFunction(request);
  return PlayCardResponseSchema.parse(response.data);
};

const drawCardFunction = httpsCallable(functions, "drawCard");
export const drawCard = async (request: DrawCardRequest) => {
  const response = await drawCardFunction(request);
  return DrawCardResponseSchema.parse(response.data);
};

const passTurnFunction = httpsCallable(functions, "passTurn");
export const passTurn = async (request: PassTurnRequest): Promise<void> => {
  await passTurnFunction(request);
};

const callUnoFunction = httpsCallable(functions, "callUno");
export const callUno = async (request: CallUnoRequest) => {
  const response = await callUnoFunction(request);
  return CallUnoResponseSchema.parse(response.data);
};

export const onGameUpdate = (
  gameId: string,
  onUpdate: (game: Game) => void,
): (() => void) => {
  return onSnapshot(
    gameRef(gameId),
    (snapshot) => {
      if (!snapshot.exists()) {
        console.warn(`Game ${gameId} not found`);
        return;
      }
      const game = snapshot.data();
      onUpdate(game);
    },
    (error) => {
      console.error("Firestore listener error (onGameUpdate):", error);
    },
  );
};

export const onGamePlayersUpdate = (
  gameId: string,
  onUpdate: (players: GamePlayer[]) => void,
): (() => void) => {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  // Check parent game exists before subscribing to players subcollection
  getDoc(gameRef(gameId)).then((snap) => {
    if (cancelled) return;
    if (!snap.exists()) {
      console.warn(`Game ${gameId} not found — skipping players listener`);
      return;
    }
    unsubscribe = onSnapshot(
      gamePlayersRef(gameId),
      (snapshot) => {
        const players = snapshot.docs.map((doc) => doc.data());
        onUpdate(players);
      },
      (error) => {
        console.error("Firestore listener error (onGamePlayersUpdate):", error);
      },
    );
  });

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
};

export const onUserGamesUpdate = (
  userId: string,
  onUpdate: (games: Game[]) => void,
): (() => void) => {
  const userGamesQuery = query(
    gamesRef(),
    where("players", "array-contains", userId),
  );

  return onSnapshot(
    userGamesQuery,
    (snapshot) => {
      const games = snapshot.docs.map((doc) => doc.data());
      onUpdate(games);
    },
    (error) => {
      console.error("Firestore listener error (onUserGamesUpdate):", error);
    },
  );
};

export const onPlayerHandUpdate = (
  gameId: string,
  playerId: string,
  onUpdate: (hand: PlayerHand) => void,
): (() => void) => {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  // Check parent game exists before subscribing to player hand
  getDoc(gameRef(gameId)).then((snap) => {
    if (cancelled) return;
    if (!snap.exists()) {
      console.warn(
        `Game ${gameId} not found — skipping playerHand listener for ${playerId}`,
      );
      return;
    }
    unsubscribe = onSnapshot(
      doc(playerHandsRef(gameId), playerId),
      (snapshot) => {
        if (!snapshot.exists()) {
          console.warn(`Player hand for ${playerId} not found`);
          return;
        }
        const hand = snapshot.data();
        onUpdate(hand);
      },
      (error) => {
        console.error("Firestore listener error (onPlayerHandUpdate):", error);
      },
    );
  });

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
};
