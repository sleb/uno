import {
  type CreateGameRequest,
  type GameData,
  GameDataSchema,
  type GamePlayerData,
  type UserData,
  UserDataSchema,
} from "@uno/shared";
import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { db } from "../firebase";

const DECK_SIZE = 108;

const getDoc = async (
  ref: DocumentReference,
  t?: Transaction,
): Promise<DocumentSnapshot> => {
  return await (t ? t.get(ref) : ref.get());
};

const gamesRef = () => db.collection("games");
const usersRef = () => db.collection("users");
const playersRef = (gameId: string) =>
  gamesRef().doc(gameId).collection("players");

const gameRef = (gameId: string) => gamesRef().doc(gameId);
const userRef = (userId: string) => usersRef().doc(userId);
const playerRef = (gameId: string, userId: string) =>
  playersRef(gameId).doc(userId);

const newGameRef = () => gamesRef().doc();

const getGame = async (gameId: string, t?: Transaction): Promise<GameData> => {
  const snapshot = await getDoc(gameRef(gameId), t);

  if (!snapshot.exists) {
    throw new Error(`Game ${gameId} not found`);
  }

  return GameDataSchema.parse(snapshot.data());
};

const getUser = async (
  userId: string,
  transaction?: Transaction,
): Promise<UserData> => {
  const snapshot = await getDoc(userRef(userId), transaction);

  if (!snapshot.exists) {
    throw new Error(`User ${userId} not found`);
  }

  return UserDataSchema.parse(snapshot.data());
};

const generateDeckSeed = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const createGame = async (
  hostId: string,
  { isPrivate, houseRules, maxPlayers }: CreateGameRequest,
): Promise<string> => {
  const gameDocRef = newGameRef();
  const now = new Date().toISOString();

  await gameDocRef.set({
    createdAt: now,
    lastActivityAt: now,
    config: {
      isPrivate,
      houseRules,
      maxPlayers,
    },
    players: [],
    state: {
      status: "waiting",
      currentTurnPlayerId: null,
      direction: "clockwise",
      deckSeed: generateDeckSeed(),
      drawPileCount: DECK_SIZE,
      discardPile: [],
    },
    startedAt: null,
  });

  await addPlayerToGame(gameDocRef.id, hostId);

  return gameDocRef.id;
};

export const addPlayerToGame = async (gameId: string, userId: string) => {
  db.runTransaction(async (t) => {
    const {
      players,
      config: { maxPlayers },
    } = await getGame(gameId, t);
    const { avatar, displayName } = await getUser(userId, t);

    if (players.includes(userId)) {
      console.log(`User ${userId} is already a player in game ${gameId}`);
      return;
    }

    if (players.length >= maxPlayers) {
      throw new Error(`Game ${gameId} is full`);
    }

    const updatedPlayers = [...players, userId];
    t.update(gameRef(gameId), { players: updatedPlayers });

    const now = new Date().toISOString();
    const playerData: GamePlayerData = {
      userId,
      displayName,
      avatar,
      joinedAt: now,
      cardCount: 0,
      hasCalledUno: false,
      status: "waiting",
      lastActionAt: now,
      hand: [],
      gameStats: {
        cardsPlayed: 0,
        cardsDrawn: 0,
        turnsPlayed: 0,
        specialCardsPlayed: 0,
      },
    };

    t.set(playerRef(gameId, userId), playerData);
  });
};
