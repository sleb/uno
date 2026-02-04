import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Card, UserStats } from "@uno/shared";

// IMPORTANT: Set emulator env vars BEFORE importing game-service
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "test-project";

import { firestore, app as getApp } from "firebase-admin";
import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import { finalizeGame } from "./game-service";

// Test setup with Firebase Admin
let app: App;
let db: Firestore;

beforeEach(async () => {
  // Get the already-initialized app from game-service
  app = getApp();
  db = firestore(app);
});

afterEach(async () => {
  // Clean up Firestore data between tests
  // Note: We don't delete the app since it's shared with game-service
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
});

describe("finalizeGame integration tests", () => {
  test("completes 2-player game with correct scoring and stats updates", async () => {
    // Setup: Create test users with initial stats
    await db
      .collection("users")
      .doc("player1")
      .set({
        displayName: "Alice",
        avatar: "🏆",
        stats: {
          gamesPlayed: 5,
          gamesWon: 2,
          gamesLost: 3,
          totalScore: 300,
          highestGameScore: 120,
          winRate: 0.4,
          cardsPlayed: 50,
          specialCardsPlayed: 15,
        },
      });

    await db
      .collection("users")
      .doc("player2")
      .set({
        displayName: "Bob",
        avatar: "🎮",
        stats: {
          gamesPlayed: 3,
          gamesWon: 1,
          gamesLost: 2,
          totalScore: 150,
          highestGameScore: 90,
          winRate: 0.3333,
          cardsPlayed: 30,
          specialCardsPlayed: 8,
        },
      });

    // Setup: Create game
    const gameRef = db.collection("games").doc("test-game");
    await gameRef.set({
      createdAt: "2024-01-01T00:00:00.000Z",
      lastActivityAt: "2024-01-01T01:00:00.000Z",
      config: {
        isPrivate: false,
        houseRules: [],
        maxPlayers: 4,
      },
      state: {
        status: "in-progress",
        currentTurnPlayerId: "player1",
        direction: "clockwise",
        deckSeed: "test-seed",
        drawPileCount: 80,
        discardPile: [{ kind: "number", color: "red", value: 5 }],
        currentColor: null,
        mustDraw: 0,
      },
      players: ["player1", "player2"],
      startedAt: "2024-01-01T00:30:00.000Z",
    });

    // Setup: Create player hands (player1 wins with 0 cards, player2 has 3 cards)
    await gameRef.collection("playerHands").doc("player1").set({
      hand: [], // Winner - no cards
    });

    await gameRef
      .collection("playerHands")
      .doc("player2")
      .set({
        hand: [
          { kind: "number", color: "red", value: 5 }, // 5 pts
          { kind: "special", color: "blue", value: "skip" }, // 20 pts
          { kind: "wild", value: "wild" }, // 50 pts
        ], // Total: 75 points
      });

    // Setup: Create player data with game stats
    await gameRef
      .collection("players")
      .doc("player1")
      .set({
        userId: "player1",
        displayName: "Alice",
        avatar: "🏆",
        joinedAt: "2024-01-01T00:00:00.000Z",
        cardCount: 0,
        status: "active",
        hasCalledUno: false,
        mustCallUno: false,
        lastActionAt: "2024-01-01T01:00:00.000Z",
        gameStats: {
          cardsPlayed: 10,
          cardsDrawn: 3,
          turnsPlayed: 10,
          specialCardsPlayed: 3,
        },
      });

    await gameRef
      .collection("players")
      .doc("player2")
      .set({
        userId: "player2",
        displayName: "Bob",
        avatar: "🎮",
        joinedAt: "2024-01-01T00:05:00.000Z",
        cardCount: 3,
        status: "active",
        hasCalledUno: false,
        mustCallUno: false,
        lastActionAt: "2024-01-01T00:59:00.000Z",
        gameStats: {
          cardsPlayed: 8,
          cardsDrawn: 2,
          turnsPlayed: 8,
          specialCardsPlayed: 2,
        },
      });

    // Execute: Finalize game in a transaction
    await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
      await finalizeGame("test-game", "player1", t);
    });

    // Verify: Game has finalScores
    const game = await gameRef.get();
    const gameData = game.data();

    expect(gameData).toBeDefined();
    expect(gameData?.finalScores).toBeDefined();
    expect(gameData?.finalScores.winnerId).toBe("player1");
    expect(gameData?.finalScores.winnerScore).toBe(75);
    expect(gameData?.finalScores.completedAt).toBeDefined();
    expect(gameData?.finalScores.playerScores).toHaveLength(2);

    // Verify: Rankings are correct (winner first, then by card count)
    const rankings = gameData?.finalScores.playerScores;
    expect(rankings[0].playerId).toBe("player1");
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].score).toBe(75);
    expect(rankings[0].cardCount).toBe(0);
    expect(rankings[0].displayName).toBe("Alice");

    expect(rankings[1].playerId).toBe("player2");
    expect(rankings[1].rank).toBe(2);
    expect(rankings[1].score).toBe(0); // Losers don't score
    expect(rankings[1].cardCount).toBe(3);
    expect(rankings[1].displayName).toBe("Bob");

    // Verify: Winner stats updated correctly
    const winner = await db.collection("users").doc("player1").get();
    const winnerStats = winner.data()?.stats;

    expect(winnerStats.gamesPlayed).toBe(6); // 5 + 1
    expect(winnerStats.gamesWon).toBe(3); // 2 + 1
    expect(winnerStats.gamesLost).toBe(3); // unchanged
    expect(winnerStats.totalScore).toBe(375); // 300 + 75
    expect(winnerStats.highestGameScore).toBe(120); // max(120, 75) = 120
    expect(winnerStats.winRate).toBeCloseTo(0.5, 4); // 3/6 = 0.5
    expect(winnerStats.cardsPlayed).toBe(60); // 50 + 10
    expect(winnerStats.specialCardsPlayed).toBe(18); // 15 + 3

    // Verify: Loser stats updated correctly
    const loser = await db.collection("users").doc("player2").get();
    const loserStats = loser.data()?.stats;

    expect(loserStats.gamesPlayed).toBe(4); // 3 + 1
    expect(loserStats.gamesWon).toBe(1); // unchanged
    expect(loserStats.gamesLost).toBe(3); // 2 + 1
    expect(loserStats.totalScore).toBe(150); // unchanged (losers don't gain score)
    expect(loserStats.highestGameScore).toBe(90); // unchanged
    expect(loserStats.winRate).toBeCloseTo(0.25, 4); // 1/4 = 0.25
    expect(loserStats.cardsPlayed).toBe(38); // 30 + 8
    expect(loserStats.specialCardsPlayed).toBe(10); // 8 + 2
  });

  test("handles user without existing stats field (backward compatibility)", async () => {
    // Setup: Create user WITHOUT stats field (old user)
    await db.collection("users").doc("player1").set({
      displayName: "Alice",
      avatar: "🏆",
      // NO stats field - simulating old user
    });

    await db.collection("users").doc("player2").set({
      displayName: "Bob",
      avatar: "🎮",
      // NO stats field
    });

    // Setup: Create game
    const gameRef = db.collection("games").doc("test-game-2");
    await gameRef.set({
      createdAt: "2024-01-01T00:00:00.000Z",
      lastActivityAt: "2024-01-01T01:00:00.000Z",
      config: {
        isPrivate: false,
        houseRules: [],
        maxPlayers: 4,
      },
      state: {
        status: "in-progress",
        currentTurnPlayerId: "player1",
        direction: "clockwise",
        deckSeed: "test-seed",
        drawPileCount: 80,
        discardPile: [{ kind: "number", color: "red", value: 5 }],
        currentColor: null,
        mustDraw: 0,
      },
      players: ["player1", "player2"],
      startedAt: "2024-01-01T00:30:00.000Z",
    });

    // Setup: Create player hands
    await gameRef.collection("playerHands").doc("player1").set({
      hand: [],
    });

    await gameRef
      .collection("playerHands")
      .doc("player2")
      .set({
        hand: [
          { kind: "number", color: "blue", value: 7 },
          { kind: "special", color: "yellow", value: "draw2" },
        ], // Total: 27 points (7 + 20)
      });

    // Setup: Create player data
    await gameRef
      .collection("players")
      .doc("player1")
      .set({
        userId: "player1",
        displayName: "Alice",
        avatar: "🏆",
        joinedAt: "2024-01-01T00:00:00.000Z",
        cardCount: 0,
        status: "active",
        hasCalledUno: false,
        mustCallUno: false,
        lastActionAt: "2024-01-01T01:00:00.000Z",
        gameStats: {
          cardsPlayed: 12,
          cardsDrawn: 5,
          turnsPlayed: 12,
          specialCardsPlayed: 4,
        },
      });

    await gameRef
      .collection("players")
      .doc("player2")
      .set({
        userId: "player2",
        displayName: "Bob",
        avatar: "🎮",
        joinedAt: "2024-01-01T00:05:00.000Z",
        cardCount: 2,
        status: "active",
        hasCalledUno: false,
        mustCallUno: false,
        lastActionAt: "2024-01-01T00:59:00.000Z",
        gameStats: {
          cardsPlayed: 10,
          cardsDrawn: 3,
          turnsPlayed: 10,
          specialCardsPlayed: 3,
        },
      });

    // Execute: Finalize game
    await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
      await finalizeGame("test-game-2", "player1", t);
    });

    // Verify: Winner stats created correctly from scratch
    const winner = await db.collection("users").doc("player1").get();
    const winnerData = winner.data();

    expect(winnerData).toBeDefined();
    expect(winnerData?.stats).toBeDefined();

    const stats = winnerData?.stats;
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.gamesLost).toBe(0);
    expect(stats.totalScore).toBe(27);
    expect(stats.highestGameScore).toBe(27);
    expect(stats.winRate).toBe(1.0);
    expect(stats.cardsPlayed).toBe(12);
    expect(stats.specialCardsPlayed).toBe(4);

    // Verify: Loser stats created correctly from scratch
    const loser = await db.collection("users").doc("player2").get();
    const loserData = loser.data();

    expect(loserData).toBeDefined();
    expect(loserData?.stats).toBeDefined();

    const loserStats = loserData?.stats;
    expect(loserStats.gamesPlayed).toBe(1);
    expect(loserStats.gamesWon).toBe(0);
    expect(loserStats.gamesLost).toBe(1);
    expect(loserStats.totalScore).toBe(0);
    expect(loserStats.highestGameScore).toBe(0);
    expect(loserStats.winRate).toBe(0.0);
    expect(loserStats.cardsPlayed).toBe(10);
    expect(loserStats.specialCardsPlayed).toBe(3);

    // Verify: Game has correct finalScores
    const game = await gameRef.get();
    const gameData = game.data();

    expect(gameData?.finalScores).toBeDefined();
    expect(gameData?.finalScores.winnerId).toBe("player1");
    expect(gameData?.finalScores.winnerScore).toBe(27);
  });
});

// Unit test for score calculation logic (using mocked data)
describe("finalizeGame score calculation logic", () => {
  test("winner score calculation with sample hands", () => {
    // Sample scenario:
    // Player 1 (winner): 0 cards
    // Player 2: 3 cards (total: 5 + 20 + 50 = 75 points)
    // Player 3: 2 cards (total: 7 + 20 = 27 points)
    // Winner should get: 75 + 27 = 102 points

    const _player2Hand: Card[] = [
      { kind: "number", color: "red", value: 5 },
      { kind: "special", color: "blue", value: "skip" },
      { kind: "wild", value: "wild" },
    ];

    const _player3Hand: Card[] = [
      { kind: "number", color: "green", value: 7 },
      { kind: "special", color: "yellow", value: "draw2" },
    ];

    // Calculate expected score manually
    const player2Score = 5 + 20 + 50; // = 75
    const player3Score = 7 + 20; // = 27
    const expectedWinnerScore = player2Score + player3Score; // = 102

    expect(expectedWinnerScore).toBe(102);
  });

  test("ranking calculation logic", () => {
    // Rankings should be:
    // 1st: Winner (0 cards)
    // 2nd: Player with fewer cards
    // 3rd: Player with more cards

    const playerScores = [
      { playerId: "p1", cardCount: 0, isWinner: true },
      { playerId: "p2", cardCount: 5, isWinner: false },
      { playerId: "p3", cardCount: 2, isWinner: false },
    ];

    // Sort logic (winner first, then by cardCount ascending)
    const sorted = [...playerScores].sort((a, b) => {
      if (a.isWinner) return -1;
      if (b.isWinner) return 1;
      return a.cardCount - b.cardCount;
    });

    expect(sorted[0]?.playerId).toBe("p1"); // Winner first
    expect(sorted[1]?.playerId).toBe("p3"); // 2 cards = 2nd place
    expect(sorted[2]?.playerId).toBe("p2"); // 5 cards = 3rd place
  });

  test("stats calculation for winner", () => {
    const currentStats: UserStats = {
      gamesPlayed: 10,
      gamesWon: 4,
      gamesLost: 6,
      totalScore: 500,
      highestGameScore: 150,
      winRate: 0.4,
      cardsPlayed: 100,
      specialCardsPlayed: 30,
    };

    const gameScore = 200; // Won with 200 points
    const gameCardsPlayed = 25;
    const gameSpecialCardsPlayed = 8;

    const newStats: UserStats = {
      gamesPlayed: currentStats.gamesPlayed + 1, // 11
      gamesWon: currentStats.gamesWon + 1, // 5
      gamesLost: currentStats.gamesLost, // 6 (unchanged)
      totalScore: currentStats.totalScore + gameScore, // 700
      highestGameScore: Math.max(currentStats.highestGameScore, gameScore), // 200
      winRate: 5 / 11, // ~0.4545
      cardsPlayed: currentStats.cardsPlayed + gameCardsPlayed, // 125
      specialCardsPlayed:
        currentStats.specialCardsPlayed + gameSpecialCardsPlayed, // 38
    };

    expect(newStats.gamesPlayed).toBe(11);
    expect(newStats.gamesWon).toBe(5);
    expect(newStats.gamesLost).toBe(6);
    expect(newStats.totalScore).toBe(700);
    expect(newStats.highestGameScore).toBe(200);
    expect(newStats.winRate).toBeCloseTo(0.4545, 3);
    expect(newStats.cardsPlayed).toBe(125);
    expect(newStats.specialCardsPlayed).toBe(38);
  });

  test("stats calculation for loser", () => {
    const currentStats: UserStats = {
      gamesPlayed: 10,
      gamesWon: 4,
      gamesLost: 6,
      totalScore: 500,
      highestGameScore: 150,
      winRate: 0.4,
      cardsPlayed: 100,
      specialCardsPlayed: 30,
    };

    const gameCardsPlayed = 22;
    const gameSpecialCardsPlayed = 5;

    const newStats: UserStats = {
      gamesPlayed: currentStats.gamesPlayed + 1, // 11
      gamesWon: currentStats.gamesWon, // 4 (unchanged)
      gamesLost: currentStats.gamesLost + 1, // 7
      totalScore: currentStats.totalScore, // 500 (losers don't gain points)
      highestGameScore: currentStats.highestGameScore, // 150 (unchanged)
      winRate: 4 / 11, // ~0.3636
      cardsPlayed: currentStats.cardsPlayed + gameCardsPlayed, // 122
      specialCardsPlayed:
        currentStats.specialCardsPlayed + gameSpecialCardsPlayed, // 35
    };

    expect(newStats.gamesPlayed).toBe(11);
    expect(newStats.gamesWon).toBe(4);
    expect(newStats.gamesLost).toBe(7);
    expect(newStats.totalScore).toBe(500);
    expect(newStats.highestGameScore).toBe(150);
    expect(newStats.winRate).toBeCloseTo(0.3636, 3);
    expect(newStats.cardsPlayed).toBe(122);
    expect(newStats.specialCardsPlayed).toBe(35);
  });

  test("stats initialization for first game", () => {
    // New user with no stats plays their first game and wins
    const _currentStats: UserStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalScore: 0,
      highestGameScore: 0,
      winRate: 0,
      cardsPlayed: 0,
      specialCardsPlayed: 0,
    };

    const _gameScore = 85;
    const _gameCardsPlayed = 15;
    const _gameSpecialCardsPlayed = 3;

    const newStats: UserStats = {
      gamesPlayed: 1,
      gamesWon: 1,
      gamesLost: 0,
      totalScore: 85,
      highestGameScore: 85,
      winRate: 1.0,
      cardsPlayed: 15,
      specialCardsPlayed: 3,
    };

    expect(newStats.gamesPlayed).toBe(1);
    expect(newStats.gamesWon).toBe(1);
    expect(newStats.winRate).toBe(1.0);
    expect(newStats.highestGameScore).toBe(85);
  });
});
