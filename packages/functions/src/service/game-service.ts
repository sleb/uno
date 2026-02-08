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
import { DECK_SIZE, generateCardAtIndex } from "./deck-utils";
import { drawCardsFromDeck, generateDeckSeed } from "./draw-utils";
import type { RuleContext, RuleEffect } from "./rules";
import {
  applyFinalizePhase,
  applyRulePhase,
  createDefaultRulePipeline,
} from "./rules";
import { calculateHandScore } from "./score-utils";

export const getDoc = async (
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
export const userRef = (userId: string) => usersRef().doc(userId);
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

export const getGamePlayer = async (
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

export const getPlayerHands = async (
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

const sortValueForCompare = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValueForCompare);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    const sorted: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      sorted[key] = sortValueForCompare(entryValue);
    }
    return sorted;
  }

  return value;
};

const stableJsonStringify = (value: unknown): string => {
  if (value === undefined) {
    return "undefined";
  }
  return JSON.stringify(sortValueForCompare(value));
};

const getEffectSourceRule = (effect: RuleEffect): string => {
  return effect.sourceRule ?? "unknown-rule";
};

export const detectEffectConflicts = (effects: RuleEffect[]): {
  gameUpdates: Record<string, unknown>;
  playerUpdates: Record<string, Record<string, unknown>>;
  handUpdates: Record<string, Card[]>;
  winnerId?: string;
  preFetchedData?: any;
} => {
  const gameUpdates: Record<string, unknown> = {};
  const playerUpdates: Record<string, Record<string, unknown>> = {};
  const handUpdates: Record<string, Card[]> = {};
  let winnerId: string | undefined;
  let preFetchedData: any;

  const gameUpdateSources = new Map<
    string,
    { valueKey: string; sourceRule: string }
  >();
  const playerUpdateSources = new Map<
    string,
    Map<string, { valueKey: string; sourceRule: string }>
  >();
  const handUpdateSources = new Map<
    string,
    { valueKey: string; sourceRule: string }
  >();

  for (const effect of effects) {
    if (effect.type === "update-game") {
      const sourceRule = getEffectSourceRule(effect);
      for (const [key, value] of Object.entries(effect.updates)) {
        const valueKey = stableJsonStringify(value);
        const existing = gameUpdateSources.get(key);
        if (existing && existing.valueKey !== valueKey) {
          throw new Error(
            `Effect conflict: game.${key} updated by ${existing.sourceRule} and ${sourceRule} with different values (previous: ${existing.valueKey}, current: ${valueKey})`,
          );
        }
        gameUpdateSources.set(key, { valueKey, sourceRule });
        gameUpdates[key] = value;
      }
    } else if (effect.type === "update-player") {
      const sourceRule = getEffectSourceRule(effect);
      if (!playerUpdates[effect.playerId]) {
        playerUpdates[effect.playerId] = {};
      }
      if (!playerUpdateSources.has(effect.playerId)) {
        playerUpdateSources.set(effect.playerId, new Map());
      }

      const playerSources = playerUpdateSources.get(effect.playerId)!;
      for (const [key, value] of Object.entries(effect.updates)) {
        const valueKey = stableJsonStringify(value);
        const existing = playerSources.get(key);
        if (existing && existing.valueKey !== valueKey) {
          throw new Error(
            `Effect conflict: players[${effect.playerId}].${key} updated by ${existing.sourceRule} and ${sourceRule} with different values (previous: ${existing.valueKey}, current: ${valueKey})`,
          );
        }
        playerSources.set(key, { valueKey, sourceRule });
        playerUpdates[effect.playerId][key] = value;
      }
    } else if (effect.type === "update-hand") {
      const sourceRule = getEffectSourceRule(effect);
      const valueKey = stableJsonStringify(effect.hand);
      const existing = handUpdateSources.get(effect.playerId);
      if (existing && existing.valueKey !== valueKey) {
        throw new Error(
          `Effect conflict: playerHands[${effect.playerId}] updated by ${existing.sourceRule} and ${sourceRule} with different values (previous: ${existing.valueKey}, current: ${valueKey})`,
        );
      }
      handUpdateSources.set(effect.playerId, { valueKey, sourceRule });
      handUpdates[effect.playerId] = effect.hand;
    } else if (effect.type === "set-winner") {
      winnerId = effect.winnerId;
      preFetchedData = effect.preFetchedData;
    }
  }

  return { gameUpdates, playerUpdates, handUpdates, winnerId, preFetchedData };
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
  preFetchedData?: {
    game: GameData;
    playerHands: Record<string, PlayerHandData>;
    gamePlayers: Record<string, GamePlayerData>;
    userDataMap: Record<string, UserData>;
  },
): Promise<void> => {
  const now = new Date().toISOString();

  // If data is pre-fetched (from playCard), use it; otherwise fetch it
  let game: GameData;
  let playerIds: string[];
  let playerHands: Record<string, PlayerHandData>;
  let gamePlayers: Record<string, GamePlayerData>;
  let userDataMap: Record<string, UserData>;

  if (preFetchedData) {
    // Use pre-fetched data (avoids read-after-write in transactions)
    game = preFetchedData.game;
    playerIds = game.players;
    playerHands = preFetchedData.playerHands;
    gamePlayers = preFetchedData.gamePlayers;
    userDataMap = preFetchedData.userDataMap;
  } else {
    // Fetch data (original behavior for standalone calls)
    game = await getGame(gameId, t);
    playerIds = game.players;

    // Fetch all player hands and player docs
    playerHands = await getPlayerHands(gameId, playerIds, t);
    gamePlayers = {};

    for (const playerId of playerIds) {
      gamePlayers[playerId] = await getGamePlayer(gameId, playerId, t);
    }

    // Read all user documents
    userDataMap = {};
    for (const playerId of playerIds) {
      const userSnap = await getDoc(userRef(playerId), t);
      if (userSnap.exists) {
        userDataMap[playerId] = UserDataSchema.parse(userSnap.data());
      }
    }
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

  // 5. Update game document with final scores
  t.update(gameRef(gameId), {
    finalScores,
  });

  // 6. Update user statistics for all players
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

const runGameAction = async ({
  gameId,
  playerId,
  action,
}: {
  gameId: string;
  playerId: string;
  action: RuleContext["action"];
}): Promise<{ winnerId?: string; cardsDrawn: Card[] }> => {
  return await db.runTransaction(async (t) => {
    // IMPORTANT: Do ALL reads before ANY writes (Firestore transaction requirement)
    const game = await getGame(gameId, t);
    const playerHand = await getPlayerHand(gameId, playerId, t);
    const player = await getGamePlayer(gameId, playerId, t);

    // Fetch all player hands for rules (needed by finalize-rule and draw logic)
    const allPlayerHands = await getPlayerHands(gameId, game.players, t);

    const pipeline = createDefaultRulePipeline();
    const ruleContext: RuleContext = {
      gameId,
      playerId,
      action,
      game,
      player,
      playerHand,
      playerHands: allPlayerHands,
      transaction: t,
      now: new Date().toISOString(),
    };

    // Execute rule phases
    applyRulePhase(pipeline, "pre-validate", ruleContext);
    applyRulePhase(pipeline, "validate", ruleContext);
    const applyResult = applyRulePhase(pipeline, "apply", ruleContext);
    const finalizeResult = await applyFinalizePhase(pipeline, ruleContext);

    // Collect all effects
    const allEffects = [...applyResult.effects, ...finalizeResult.effects];

    const {
      gameUpdates,
      playerUpdates,
      handUpdates,
      winnerId,
      preFetchedData,
    } = detectEffectConflicts(allEffects);

    // Write to Firestore
    if (Object.keys(gameUpdates).length > 0) {
      t.update(gameRef(gameId), gameUpdates);
    }

    for (const [targetPlayerId, updates] of Object.entries(playerUpdates)) {
      if (Object.keys(updates).length > 0) {
        t.update(playerRef(gameId, targetPlayerId), updates);
      }
    }

    for (const [targetPlayerId, hand] of Object.entries(handUpdates)) {
      t.update(playerHandRef(gameId, targetPlayerId), { hand });
    }

    // Finalize game if there's a winner
    if (winnerId && preFetchedData) {
      await finalizeGame(gameId, winnerId, t, preFetchedData);
    }

    return {
      winnerId,
      cardsDrawn: [...applyResult.cardsDrawn, ...finalizeResult.cardsDrawn],
    };
  });
};

export const playCard = async (
  gameId: string,
  playerId: string,
  cardIndex: number,
  chosenColor?: string,
): Promise<{ winner?: string }> => {
  const result = await runGameAction({
    gameId,
    playerId,
    action: { type: "play", cardIndex, chosenColor },
  });

  return result.winnerId ? { winner: result.winnerId } : {};
};

export const drawCard = async (
  gameId: string,
  playerId: string,
  count: number,
): Promise<{ cards: Card[] }> => {
  const result = await runGameAction({
    gameId,
    playerId,
    action: { type: "draw", count },
  });

  return { cards: result.cardsDrawn };
};

export const passTurn = async (
  gameId: string,
  playerId: string,
): Promise<void> => {
  await runGameAction({
    gameId,
    playerId,
    action: { type: "pass" },
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
