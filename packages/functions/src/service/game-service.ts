import {
  type Card,
  type CreateGameRequest,
  GAME_STATUSES,
  type GameData,
  GameDataSchema,
  type GameFinalScores,
  type GamePlayerData,
  GamePlayerDataSchema,
  type PlayerHandData,
  PlayerHandDataSchema,
  type PlayerScore,
  type UserData,
  UserDataSchema,
  type UserStats,
} from "@uno/shared";
import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { db } from "../firebase";
import {
  applyCardEffect,
  getNextPlayerId,
  isCardPlayable,
} from "./card-validation";
import { generateCardAtIndex, getDeckForSeed } from "./deck-utils";
import { calculateHandScore } from "./score-utils";

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

const getGamePlayer = async (
  gameId: string,
  playerId: string,
  t?: Transaction,
): Promise<GamePlayerData> => {
  const snapshot = await getDoc(playerRef(gameId, playerId), t);

  if (!snapshot.exists) {
    throw new Error(`Player ${playerId} not found in game ${gameId}`);
  }

  return GamePlayerDataSchema.parse(snapshot.data());
};

const getPlayerHand = async (
  gameId: string,
  playerId: string,
  t?: Transaction,
): Promise<PlayerHandData> => {
  const snapshot = await getDoc(playerHandRef(gameId, playerId), t);

  if (!snapshot.exists) {
    throw new Error(`Player hand for ${playerId} not found in game ${gameId}`);
  }

  return PlayerHandDataSchema.parse(snapshot.data());
};

const getPlayerHands = async (
  gameId: string,
  playerIds: string[],
  t?: Transaction,
): Promise<Record<string, PlayerHandData>> => {
  const hands: Record<string, PlayerHandData> = {};

  for (const playerId of playerIds) {
    hands[playerId] = await getPlayerHand(gameId, playerId, t);
  }

  return hands;
};

const getGamePlayers = async (
  gameId: string,
  playerIds: string[],
  t?: Transaction,
): Promise<Record<string, GamePlayerData>> => {
  const players: Record<string, GamePlayerData> = {};

  for (const playerId of playerIds) {
    players[playerId] = await getGamePlayer(gameId, playerId, t);
  }

  return players;
};

const getTopCard = (discardPile: Card[]): Card => {
  const topCard = discardPile[discardPile.length - 1];

  if (!topCard) {
    throw new Error("Discard pile is empty");
  }

  return topCard;
};

const isSameCard = (left: Card, right: Card): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.value !== right.value) {
    return false;
  }

  if ("color" in left || "color" in right) {
    return "color" in left && "color" in right && left.color === right.color;
  }

  return true;
};

const removeCardFromDeck = (deck: Card[], card: Card): void => {
  const index = deck.findIndex((candidate) => isSameCard(candidate, card));

  if (index < 0) {
    throw new Error("Card not found in deck");
  }

  deck.splice(index, 1);
};

const buildAvailableDeck = (seed: string, usedCards: Card[]): Card[] => {
  const deck = [...getDeckForSeed(seed)];

  for (const card of usedCards) {
    removeCardFromDeck(deck, card);
  }

  return deck;
};

const buildUsedCards = (
  discardPile: Card[],
  hands: Card[],
  keepAllDiscards: boolean,
): Card[] => {
  const usedCards = [...hands];

  if (discardPile.length > 0) {
    usedCards.push(
      ...(keepAllDiscards
        ? discardPile
        : [discardPile[discardPile.length - 1]]),
    );
  }

  return usedCards;
};

const collectHandCards = (
  playerHands: Record<string, PlayerHandData>,
): Card[] => {
  return Object.values(playerHands).flatMap((hand) => hand.hand);
};

const drawCardsFromDeck = ({
  seed,
  discardPile,
  playerHands,
  count,
}: {
  seed: string;
  discardPile: Card[];
  playerHands: Record<string, PlayerHandData>;
  count: number;
}): {
  drawnCards: Card[];
  deckSeed: string;
  drawPileCount: number;
  discardPile: Card[];
} => {
  const handCards = collectHandCards(playerHands);
  let deckSeed = seed;
  let activeDiscardPile = discardPile;
  let usedCards = buildUsedCards(activeDiscardPile, handCards, true);
  let availableDeck = buildAvailableDeck(deckSeed, usedCards);

  if (availableDeck.length < count) {
    if (discardPile.length <= 1) {
      throw new Error("Not enough cards in deck to draw");
    }

    deckSeed = generateDeckSeed();
    activeDiscardPile = [getTopCard(discardPile)];
    usedCards = buildUsedCards(activeDiscardPile, handCards, false);
    availableDeck = buildAvailableDeck(deckSeed, usedCards);
  }

  if (availableDeck.length < count) {
    throw new Error("Not enough cards in deck to draw");
  }

  const drawnCards: Card[] = [];
  const remainingDeck = [...availableDeck];
  for (let i = 0; i < count; i++) {
    const nextCard = remainingDeck.shift();
    if (!nextCard) {
      throw new Error("Not enough cards in deck to draw");
    }
    drawnCards.push(nextCard);
  }

  return {
    drawnCards,
    deckSeed,
    drawPileCount: remainingDeck.length,
    discardPile: activeDiscardPile,
  };
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
      currentColor: null,
      mustDraw: 0,
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
      mustCallUno: false,
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

    const now = new Date().toISOString();

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
      t.update(playerRef(gameId, playerId), {
        cardCount: playerHand.length,
        status: "active",
        hasCalledUno: false,
        mustCallUno: false,
        lastActionAt: now,
      });
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

    t.update(gameRef(gameId), {
      startedAt: now,
      "state.status": GAME_STATUSES.IN_PROGRESS,
      "state.currentTurnPlayerId": players[0],
      "state.drawPileCount": remainingDrawPileCount,
      "state.discardPile": startingDiscardPile,
      "state.currentColor": null,
      "state.mustDraw": 0,
    });
  });
};

/**
 * Finalizes a game when a winner is detected.
 * Calculates scores, updates player statistics, and creates final scores record.
 *
 * This function MUST be called within an existing transaction to ensure atomicity.
 *
 * @param gameId - The ID of the game to finalize
 * @param winnerId - The ID of the winning player
 * @param t - Firestore transaction (required for atomicity)
 */
export const finalizeGame = async (
  gameId: string,
  winnerId: string,
  t: Transaction,
): Promise<void> => {
  const now = new Date().toISOString();

  // 1. Get all player data (both hands and player docs)
  const game = await getGame(gameId, t);
  const playerIds = game.players;

  // Fetch all player hands and player docs
  const playerHands = await getPlayerHands(gameId, playerIds, t);
  const gamePlayers: Record<string, GamePlayerData> = {};

  for (const playerId of playerIds) {
    gamePlayers[playerId] = await getGamePlayer(gameId, playerId, t);
  }

  // 2. Calculate scores for each player
  const playerScores: PlayerScore[] = [];
  let winnerTotalScore = 0;

  for (const playerId of playerIds) {
    const hand = playerHands[playerId];
    const cardCount = hand.hand.length;
    const handScore = calculateHandScore(hand.hand);

    if (playerId === winnerId) {
      // Winner has 0 cards, initialize their score entry
      playerScores.push({
        playerId,
        displayName: gamePlayers[playerId].displayName,
        score: 0, // We'll update this after calculating total
        cardCount,
        rank: 1,
      });
    } else {
      // Add this opponent's cards to winner's total score
      winnerTotalScore += handScore;

      playerScores.push({
        playerId,
        displayName: gamePlayers[playerId].displayName,
        score: 0, // Opponents don't score points
        cardCount,
        rank: 0, // We'll assign ranks after sorting
      });
    }
  }

  // Update winner's score with total points earned
  const winnerScoreIndex = playerScores.findIndex(
    (p) => p.playerId === winnerId,
  );
  playerScores[winnerScoreIndex].score = winnerTotalScore;

  // 3. Sort players by rank (winner first, then by cards remaining ascending)
  playerScores.sort((a, b) => {
    if (a.playerId === winnerId) return -1;
    if (b.playerId === winnerId) return 1;
    return a.cardCount - b.cardCount; // Fewer cards = better rank
  });

  // Assign ranks (2nd, 3rd, 4th, etc.)
  for (let i = 0; i < playerScores.length; i++) {
    if (playerScores[i].playerId !== winnerId) {
      playerScores[i].rank = i + 1;
    }
  }

  // 4. Create final scores object
  const finalScores: GameFinalScores = {
    winnerId,
    winnerScore: winnerTotalScore,
    completedAt: now,
    playerScores,
  };

  // 5. Read all user documents BEFORE any writes (required by Firestore transactions)
  const userDataMap: Record<string, UserData> = {};
  for (const playerId of playerIds) {
    const userSnap = await getDoc(userRef(playerId), t);
    if (userSnap.exists) {
      userDataMap[playerId] = UserDataSchema.parse(userSnap.data());
    }
  }

  // 6. Update game document with final scores
  t.update(gameRef(gameId), {
    finalScores,
  });

  // 7. Update user statistics for all players
  for (const playerId of playerIds) {
    const userData = userDataMap[playerId];
    if (!userData) continue; // Skip if user doesn't exist

    const currentStats = userData.stats ?? {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalScore: 0,
      highestGameScore: 0,
      winRate: 0,
      cardsPlayed: 0,
      specialCardsPlayed: 0,
    };

    const gamePlayer = gamePlayers[playerId];
    const isWinner = playerId === winnerId;

    // Calculate new stats
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newGamesWon = currentStats.gamesWon + (isWinner ? 1 : 0);
    const newGamesLost = currentStats.gamesLost + (isWinner ? 0 : 1);
    const newTotalScore =
      currentStats.totalScore + (isWinner ? winnerTotalScore : 0);
    const newHighestGameScore = isWinner
      ? Math.max(currentStats.highestGameScore, winnerTotalScore)
      : currentStats.highestGameScore;
    const newWinRate = newGamesWon / newGamesPlayed;

    // Add game stats to lifetime stats
    const newCardsPlayed =
      currentStats.cardsPlayed + gamePlayer.gameStats.cardsPlayed;
    const newSpecialCardsPlayed =
      currentStats.specialCardsPlayed + gamePlayer.gameStats.specialCardsPlayed;

    const updatedStats: UserStats = {
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      gamesLost: newGamesLost,
      totalScore: newTotalScore,
      highestGameScore: newHighestGameScore,
      winRate: newWinRate,
      cardsPlayed: newCardsPlayed,
      specialCardsPlayed: newSpecialCardsPlayed,
    };

    // Update user document
    t.update(userRef(playerId), {
      stats: updatedStats,
    });
  }
};

export const playCard = async (
  gameId: string,
  playerId: string,
  cardIndex: number,
  chosenColor?: string,
): Promise<{ winner?: string }> => {
  return await db.runTransaction(async (t) => {
    const game = await getGame(gameId, t);

    if (game.state.status !== GAME_STATUSES.IN_PROGRESS) {
      throw new Error(`Game ${gameId} is not in progress`);
    }

    const currentIndex = game.players.indexOf(playerId);
    if (currentIndex < 0) {
      throw new Error(`Player ${playerId} is not in game ${gameId}`);
    }

    if (game.state.currentTurnPlayerId !== playerId) {
      throw new Error("Not your turn");
    }

    const playerHand = await getPlayerHand(gameId, playerId, t);
    const player = await getGamePlayer(gameId, playerId, t);
    const playedCard = playerHand.hand[cardIndex];

    if (!playedCard) {
      throw new Error("Invalid card index");
    }

    const topCard = getTopCard(game.state.discardPile);
    const { currentColor, mustDraw } = game.state;

    if (!isCardPlayable(playedCard, topCard, currentColor, mustDraw)) {
      throw new Error("Card cannot be played");
    }

    if (playedCard.kind === "wild" && !chosenColor) {
      throw new Error("Wild card requires chosen color");
    }

    if (playedCard.kind === "wild" && playedCard.value === "wild_draw4") {
      const activeColor =
        currentColor ?? (topCard.kind === "wild" ? null : topCard.color);
      if (mustDraw === 0 && activeColor) {
        const hasColorMatch = playerHand.hand.some(
          (card, index) =>
            index !== cardIndex &&
            "color" in card &&
            card.color === activeColor,
        );
        if (hasColorMatch) {
          throw new Error(
            "Wild Draw Four can only be played when you have no matching color",
          );
        }
      }
    }

    const newHand = playerHand.hand.filter((_, index) => index !== cardIndex);
    const updatedDiscardPile = [...game.state.discardPile, playedCard];
    const cardEffects = applyCardEffect(
      playedCard,
      game.state.direction,
      mustDraw,
    );
    const reverseSkip =
      playedCard.kind === "special" &&
      playedCard.value === "reverse" &&
      game.players.length === 2;
    const skipNext = cardEffects.skipNext || reverseSkip;
    const nextPlayerId = getNextPlayerId(
      game.players,
      currentIndex,
      cardEffects.direction,
      skipNext,
    );
    const isWinner = newHand.length === 0;
    const now = new Date().toISOString();

    t.update(gameRef(gameId), {
      "state.discardPile": updatedDiscardPile,
      "state.currentTurnPlayerId": isWinner ? null : nextPlayerId,
      "state.direction": cardEffects.direction,
      "state.mustDraw": cardEffects.mustDraw,
      "state.currentColor": playedCard.kind === "wild" ? chosenColor : null,
      "state.status": isWinner
        ? GAME_STATUSES.COMPLETED
        : GAME_STATUSES.IN_PROGRESS,
      lastActivityAt: now,
    });

    t.update(playerHandRef(gameId, playerId), { hand: newHand });
    t.update(playerRef(gameId, playerId), {
      cardCount: newHand.length,
      status: isWinner ? "winner" : "active",
      hasCalledUno: false,
      mustCallUno: newHand.length === 1,
      "gameStats.cardsPlayed": player.gameStats.cardsPlayed + 1,
      "gameStats.turnsPlayed": player.gameStats.turnsPlayed + 1,
      "gameStats.specialCardsPlayed":
        player.gameStats.specialCardsPlayed +
        (playedCard.kind === "number" ? 0 : 1),
      lastActionAt: now,
    });

    // Finalize game if there's a winner (calculate scores, update stats)
    if (isWinner) {
      await finalizeGame(gameId, playerId, t);
    }

    return { winner: isWinner ? playerId : undefined };
  });
};

export const drawCard = async (
  gameId: string,
  playerId: string,
  count: number,
): Promise<{ cards: Card[] }> => {
  return await db.runTransaction(async (t) => {
    const game = await getGame(gameId, t);

    if (game.state.status !== GAME_STATUSES.IN_PROGRESS) {
      throw new Error(`Game ${gameId} is not in progress`);
    }

    const currentIndex = game.players.indexOf(playerId);
    if (currentIndex < 0) {
      throw new Error(`Player ${playerId} is not in game ${gameId}`);
    }

    if (game.state.currentTurnPlayerId !== playerId) {
      throw new Error("Not your turn");
    }

    const playerHand = await getPlayerHand(gameId, playerId, t);
    const playerHands = await getPlayerHands(gameId, game.players, t);
    const drawCount = game.state.mustDraw > 0 ? game.state.mustDraw : count;

    const { drawnCards, deckSeed, drawPileCount, discardPile } =
      drawCardsFromDeck({
        seed: game.state.deckSeed,
        discardPile: game.state.discardPile,
        playerHands,
        count: drawCount,
      });

    const newHand = [...playerHand.hand, ...drawnCards];
    const now = new Date().toISOString();
    const nextPlayerId = getNextPlayerId(
      game.players,
      currentIndex,
      game.state.direction,
      false,
    );

    t.update(gameRef(gameId), {
      "state.deckSeed": deckSeed,
      "state.drawPileCount": drawPileCount,
      "state.discardPile": discardPile,
      "state.currentTurnPlayerId": nextPlayerId,
      "state.mustDraw": 0,
      lastActivityAt: now,
    });

    t.update(playerHandRef(gameId, playerId), { hand: newHand });
    t.update(playerRef(gameId, playerId), {
      cardCount: newHand.length,
      status: "active",
      hasCalledUno: false,
      mustCallUno: false,
      "gameStats.cardsDrawn": player.gameStats.cardsDrawn + drawCount,
      "gameStats.turnsPlayed": player.gameStats.turnsPlayed + 1,
      lastActionAt: now,
    });

    return { cards: drawnCards };
  });
};

export const callUno = async (
  gameId: string,
  playerId: string,
): Promise<{ caughtPlayerId?: string }> => {
  return await db.runTransaction(async (t) => {
    const game = await getGame(gameId, t);

    if (game.state.status !== GAME_STATUSES.IN_PROGRESS) {
      throw new Error(`Game ${gameId} is not in progress`);
    }

    const currentIndex = game.players.indexOf(playerId);
    if (currentIndex < 0) {
      throw new Error(`Player ${playerId} is not in game ${gameId}`);
    }
    const playerHand = await getPlayerHand(gameId, playerId, t);
    const now = new Date().toISOString();

    if (playerHand.hand.length === 1) {
      t.update(playerRef(gameId, playerId), {
        hasCalledUno: true,
        mustCallUno: false,
        lastActionAt: now,
      });
      t.update(gameRef(gameId), { lastActivityAt: now });
      return {};
    }

    const players = await getGamePlayers(gameId, game.players, t);
    const targetEntry = Object.entries(players).find(
      ([id, target]) => id !== playerId && target.mustCallUno,
    );

    if (!targetEntry) {
      throw new Error("No player to catch for UNO");
    }

    const [targetId, targetPlayer] = targetEntry;
    const playerHands = await getPlayerHands(gameId, game.players, t);
    const targetHand = playerHands[targetId];

    if (!targetHand) {
      throw new Error(
        `Player hand for ${targetId} not found in game ${gameId}`,
      );
    }

    const { drawnCards, deckSeed, drawPileCount, discardPile } =
      drawCardsFromDeck({
        seed: game.state.deckSeed,
        discardPile: game.state.discardPile,
        playerHands,
        count: 2,
      });

    const updatedHand = [...targetHand.hand, ...drawnCards];

    t.update(gameRef(gameId), {
      "state.deckSeed": deckSeed,
      "state.drawPileCount": drawPileCount,
      "state.discardPile": discardPile,
      lastActivityAt: now,
    });
    t.update(playerHandRef(gameId, targetId), { hand: updatedHand });
    t.update(playerRef(gameId, targetId), {
      cardCount: updatedHand.length,
      hasCalledUno: false,
      mustCallUno: false,
      "gameStats.cardsDrawn": targetPlayer.gameStats.cardsDrawn + 2,
      lastActionAt: now,
    });
    t.update(playerRef(gameId, playerId), { lastActionAt: now });
    return { caughtPlayerId: targetId };
  });
};
