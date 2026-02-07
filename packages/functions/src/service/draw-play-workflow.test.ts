import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

// IMPORTANT: Set emulator env vars BEFORE importing game-service
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "test-project";

import {
  assertEmulatorAvailable,
  cleanupTestData,
  getFirebaseForTest,
} from "../__test-helpers__/firebase-test";
import { drawCard, passTurn, playCard } from "./game-service";

// Test setup with Firebase Admin
let app: import("firebase-admin").app.App;
let db: FirebaseFirestore.Firestore;

beforeEach(async () => {
  const firebase = getFirebaseForTest();
  app = firebase.app;
  db = firebase.db;
});

beforeAll(async () => {
  const firebase = getFirebaseForTest();
  await assertEmulatorAvailable(firebase.db);
});

afterEach(async () => {
  await cleanupTestData(db);
});

const setupGame = async () => {
  const now = new Date().toISOString();

  // Create users
  await db
    .collection("users")
    .doc("alice")
    .set({
      displayName: "Alice",
      avatar: "🎮",
      email: "alice@test.com",
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalScore: 0,
        highestGameScore: 0,
        winRate: 0,
        cardsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });

  await db
    .collection("users")
    .doc("bob")
    .set({
      displayName: "Bob",
      avatar: "🎯",
      email: "bob@test.com",
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalScore: 0,
        highestGameScore: 0,
        winRate: 0,
        cardsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });

  // Create game
  await db
    .collection("games")
    .doc("test-game")
    .set({
      createdAt: now,
      lastActivityAt: now,
      startedAt: now,
      config: {
        isPrivate: false,
        houseRules: [],
        maxPlayers: 4,
      },
      state: {
        status: "in-progress",
        currentTurnPlayerId: "alice",
        direction: "clockwise",
        deckSeed: "test-seed",
        drawPileCount: 80,
        discardPile: [{ kind: "number", color: "blue", value: 7 }],
        currentColor: null,
        mustDraw: 0,
      },
      players: ["alice", "bob"],
    });

  // Create Alice's player doc and hand
  await db
    .collection("games")
    .doc("test-game")
    .collection("players")
    .doc("alice")
    .set({
      userId: "alice",
      displayName: "Alice",
      avatar: "🎮",
      joinedAt: now,
      cardCount: 2,
      status: "active",
      hasCalledUno: false,
      mustCallUno: false,
      lastActionAt: now,
      gameStats: {
        cardsPlayed: 0,
        cardsDrawn: 0,
        turnsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });

  await db
    .collection("games")
    .doc("test-game")
    .collection("playerHands")
    .doc("alice")
    .set({
      hand: [
        { kind: "number", color: "red", value: 3 },
        { kind: "number", color: "yellow", value: 8 },
      ],
    });

  // Create Bob's player doc and hand
  await db
    .collection("games")
    .doc("test-game")
    .collection("players")
    .doc("bob")
    .set({
      userId: "bob",
      displayName: "Bob",
      avatar: "🎯",
      joinedAt: now,
      cardCount: 3,
      status: "active",
      hasCalledUno: false,
      mustCallUno: false,
      lastActionAt: now,
      gameStats: {
        cardsPlayed: 0,
        cardsDrawn: 0,
        turnsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });

  await db
    .collection("games")
    .doc("test-game")
    .collection("playerHands")
    .doc("bob")
    .set({
      hand: [
        { kind: "number", color: "blue", value: 2 },
        { kind: "number", color: "green", value: 5 },
        { kind: "special", color: "red", value: "skip" },
      ],
    });
};

describe("Draw-then-play workflow", () => {
  test("normal draw keeps turn with player", async () => {
    await setupGame();

    // Alice draws a card (no penalty)
    await drawCard("test-game", "alice", 1);

    // Turn should still be Alice's
    const game = await db.collection("games").doc("test-game").get();
    expect(game.data()?.state.currentTurnPlayerId).toBe("alice");

    // Alice should have 3 cards now
    const hand = await db
      .collection("games")
      .doc("test-game")
      .collection("playerHands")
      .doc("alice")
      .get();
    expect(hand.data()?.hand.length).toBe(3);
  });

  test("playing card after draw advances turn", async () => {
    await setupGame();

    // Draw a card
    await drawCard("test-game", "alice", 1);

    // Manually set a playable card in the hand
    await db
      .collection("games")
      .doc("test-game")
      .collection("playerHands")
      .doc("alice")
      .update({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "yellow", value: 8 },
          { kind: "number", color: "blue", value: 5 }, // playable - matches discard
        ],
      });

    // Play the drawn card (index 2)
    await playCard("test-game", "alice", 2);

    // Turn should now be Bob's
    const game = await db.collection("games").doc("test-game").get();
    expect(game.data()?.state.currentTurnPlayerId).toBe("bob");
  });

  test("passing turn after draw advances to next player", async () => {
    await setupGame();

    // Draw a card
    await drawCard("test-game", "alice", 1);

    // Pass turn
    await passTurn("test-game", "alice");

    // Turn should now be Bob's
    const game = await db.collection("games").doc("test-game").get();
    expect(game.data()?.state.currentTurnPlayerId).toBe("bob");
  });

  test("penalty draw automatically advances turn", async () => {
    await setupGame();

    // Set penalty
    await db.collection("games").doc("test-game").update({
      "state.mustDraw": 2,
    });

    // Draw penalty cards
    await drawCard("test-game", "alice", 1);

    // Turn should automatically be Bob's
    const game = await db.collection("games").doc("test-game").get();
    expect(game.data()?.state.currentTurnPlayerId).toBe("bob");
    expect(game.data()?.state.mustDraw).toBe(0);
  });

  test("cannot pass when penalty draw is required", async () => {
    await setupGame();

    // Set penalty
    await db.collection("games").doc("test-game").update({
      "state.mustDraw": 2,
    });

    // Try to pass without drawing
    await expect(passTurn("test-game", "alice")).rejects.toThrow(
      "must draw cards",
    );
  });
});
