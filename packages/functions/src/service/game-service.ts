import {
  type Card,
  CardSchema,
  type CreateGameRequest,
  GAME_STATUSES,
  type GameData,
  GameDataSchema,
  type GamePlayerData,
  type PlayerHandData,
  type UserData,
  UserDataSchema
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
const playerHandsRef = (gameId: string) =>
  gamesRef().doc(gameId).collection("playerHands");

const gameRef = (gameId: string) => gamesRef().doc(gameId);
const userRef = (userId: string) => usersRef().doc(userId);
const playerRef = (gameId: string, userId: string) =>
  playersRef(gameId).doc(userId);
const playerHandRef = (gameId: string, userId: string) =>
  playerHandsRef(gameId).doc(userId);

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

/**
 * Generates a card at a specific index using the deck seed.
 * Uses a deterministic algorithm to ensure consistent card generation.
 */
const generateCardAtIndex = (seed: string, index: number): Card => {
  // Create a hash from seed and index to get a deterministic random value
  const hashInput = seed + index.toString();
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  const absHash = Math.abs(hash);

  // First 40 cards are numbered 0-9 (4 of each color, 10 per color)
  if (absHash % 108 < 40) {
    const colorIndex = Math.floor((absHash % 40) / 10);
    const colors: Array<"red" | "yellow" | "green" | "blue"> = ["red", "yellow", "green", "blue"];
    const cardNumber = (absHash % 10).toString() as "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
    return CardSchema.parse({
      color: colors[colorIndex],
      value: cardNumber,
    });
  }

  // Next 24 cards are special cards: skip, reverse, draw-two (8 of each, 2 per color)
  if (absHash % 108 < 64) {
    const specialIndex = (absHash % 24);
    const specialValues: Array<"skip" | "reverse" | "draw-two"> = ["skip", "reverse", "draw-two"];
    const specialValue = specialValues[Math.floor(specialIndex / 8)];
    const colorIndex = Math.floor((specialIndex % 8) / 2);
    const colors: Array<"red" | "yellow" | "green" | "blue"> = ["red", "yellow", "green", "blue"];
    return CardSchema.parse({
      color: colors[colorIndex],
      value: specialValue,
    });
  }

  // Last 44 cards are wild and wild-draw-four
  const wildValues: Array<"wild" | "wild-draw-four"> = ["wild", "wild-draw-four"];
  const wildIndex = absHash % 44;
  const wildValue = wildValues[Math.floor(wildIndex / 22)];
  return CardSchema.parse({
    value: wildValue,
  });
};

/**
 * Generates cards from the deck, starting from the current draw pile position.
 * Does not update the game state - the caller should handle updating drawPileCount
 * and assigning cards to hands in the same transaction.
 */
export const dealCards = async (
  seed: string,
  drawPileCount: number,
  count: number,
): Promise<Card[]> => {
  // Generate cards starting from the current position in the deck
  const startIndex = DECK_SIZE - drawPileCount;
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(generateCardAtIndex(seed, startIndex + i));
  }

  return cards;
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
  await db.runTransaction(async (t) => {
    const game = await getGame(gameId, t);
    const {
      players,
      config: { maxPlayers },
      state: { status },
    } = game;
    const { avatar, displayName } = await getUser(userId, t);

    if (players.includes(userId)) {
      console.log(`User ${userId} is already a player in game ${gameId}`);
      return;
    }

    if (status !== "waiting") {
      throw new Error(`Game ${gameId} has already started or completed`);
    }

    if (players.length >= maxPlayers) {
      throw new Error(`Game ${gameId} is full`);
    }

    const updatedPlayers = [...players, userId];
    t.update(gameRef(gameId), { players: updatedPlayers });

    const now = new Date().toISOString();
    // Public player profile data
    const playerData: GamePlayerData = {
      userId,
      displayName,
      avatar,
      joinedAt: now,
      cardCount: 0,
      hasCalledUno: false,
      status: "waiting",
      lastActionAt: now,
      gameStats: {
        cardsPlayed: 0,
        cardsDrawn: 0,
        turnsPlayed: 0,
        specialCardsPlayed: 0,
      },
    };
    t.set(playerRef(gameId, userId), playerData);

    // Private hand data
    const handData: PlayerHandData = {
      hand: [],
    };
    t.set(playerHandRef(gameId, userId), handData);
  });
};

export const startGame = async (gameId: string): Promise<void> => {
  const CARDS_PER_PLAYER = 7;

  await db.runTransaction(async (t) => {
    const game = await getGame(gameId, t);
    const {
      players,
      state: { status, deckSeed, drawPileCount },
    } = game;

    if (status !== "waiting") {
      throw new Error(`Game ${gameId} is not in waiting status`);
    }

    if (players.length < 2) {
      throw new Error("Game must have at least 2 players to start");
    }

    const totalCardsToDeal = players.length * CARDS_PER_PLAYER;
    if (drawPileCount < totalCardsToDeal) {
      throw new Error(
        `Not enough cards in deck: need ${totalCardsToDeal}, have ${drawPileCount}`,
      );
    }

    // Generate cards for all players
    const dealtCards = await dealCards(deckSeed, drawPileCount, totalCardsToDeal);

    // Assign cards to player hands
    let cardIndex = 0;
    for (const playerId of players) {
      const playerHand = dealtCards.slice(cardIndex, cardIndex + CARDS_PER_PLAYER);
      t.update(playerHandRef(gameId, playerId), { hand: playerHand });
      cardIndex += CARDS_PER_PLAYER;
    }

    // Update game state
    const now = new Date().toISOString();
    t.update(gameRef(gameId), {
      startedAt: now,
      "state.status": GAME_STATUSES.IN_PROGRESS,
      "state.currentTurnPlayerId": players[0],
      "state.drawPileCount": drawPileCount - totalCardsToDeal,
    });
  });
};
