import {
  type Card,
  type CreateGameRequest,
  GAME_STATUSES,
  type GameData,
  GameDataSchema,
  type GamePlayerData,
  type PlayerHandData,
  type UserData,
  UserDataSchema,
} from "@uno/shared";
import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { db } from "../firebase";
import { generateCardAtIndex } from "./deck-utils";

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
      state: { status, deckSeed, drawPileCount, discardPile },
    } = game;

    if (status !== "waiting") {
      throw new Error(`Game ${gameId} is not in waiting status`);
    }

    if (players.length < 2) {
      throw new Error("Game must have at least 2 players to start");
    }

    const totalCardsToDeal = players.length * CARDS_PER_PLAYER;
    if (drawPileCount <= totalCardsToDeal) {
      throw new Error(
        `Not enough cards in deck: need more than ${totalCardsToDeal}, have ${drawPileCount}`,
      );
    }

    // Generate cards for all players
    const dealtCards = await dealCards(
      deckSeed,
      drawPileCount,
      totalCardsToDeal,
    );

    // Assign cards to player hands (create if missing)
    let cardIndex = 0;
    for (const playerId of players) {
      const playerHand = dealtCards.slice(
        cardIndex,
        cardIndex + CARDS_PER_PLAYER,
      );
      t.set(
        playerHandRef(gameId, playerId),
        { hand: playerHand },
        { merge: true },
      );
      cardIndex += CARDS_PER_PLAYER;
    }

    // Draw starting card (must be a number) and update game state
    let remainingDrawPileCount = drawPileCount - totalCardsToDeal;
    const startingDiscardPile = [...discardPile];
    let startingCard: Card | null = null;

    while (remainingDrawPileCount > 0) {
      const [nextCard] = await dealCards(deckSeed, remainingDrawPileCount, 1);
      if (!nextCard) {
        throw new Error("Failed to draw a starting card.");
      }
      remainingDrawPileCount -= 1;
      startingDiscardPile.push(nextCard);

      if (nextCard.kind === "number") {
        startingCard = nextCard;
        break;
      }
    }

    if (!startingCard) {
      throw new Error(
        "Not enough cards in deck to draw a starting number card.",
      );
    }

    const now = new Date().toISOString();
    t.update(gameRef(gameId), {
      startedAt: now,
      "state.status": GAME_STATUSES.IN_PROGRESS,
      "state.currentTurnPlayerId": players[0],
      "state.drawPileCount": remainingDrawPileCount,
      "state.discardPile": startingDiscardPile,
    });
  });
};
