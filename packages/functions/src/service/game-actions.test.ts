import { afterEach, beforeEach, describe, expect, test } from "bun:test";

// IMPORTANT: Set emulator env vars BEFORE importing game-service
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "test-project";

import { callUno, drawCard, passTurn, playCard } from "./game-service";

// Use CommonJS require for admin
const admin = require("firebase-admin");

// Test setup with Firebase Admin
let app: import("firebase-admin").app.App;
let db: FirebaseFirestore.Firestore;

beforeEach(async () => {
  // Get the already-initialized app from game-service
  app = admin.app();
  db = admin.firestore(app);
});

afterEach(async () => {
  // Clean up Firestore data between tests
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
});

/**
 * Helper function to create a test user
 */
const createUser = async (userId: string, displayName: string) => {
  await db
    .collection("users")
    .doc(userId)
    .set({
      displayName,
      avatar: "🎮",
      email: `${userId}@test.com`,
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
};

/**
 * Helper function to create a minimal in-progress game
 */
const createInProgressGame = async (
  gameId: string,
  playerIds: string[],
): Promise<void> => {
  const now = new Date().toISOString();

  // Create game document
  await db
    .collection("games")
    .doc(gameId)
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
        currentTurnPlayerId: playerIds[0],
        direction: "clockwise",
        deckSeed: `seed-${gameId}`,
        drawPileCount: 80,
        discardPile: [{ kind: "number", color: "red", value: 5 }],
        currentColor: null,
        mustDraw: 0,
      },
      players: playerIds,
    });

  // Create player docs and hands
  for (const playerId of playerIds) {
    const user = await db.collection("users").doc(playerId).get();

    // Create player doc
    await db
      .collection("games")
      .doc(gameId)
      .collection("players")
      .doc(playerId)
      .set({
        userId: playerId,
        displayName: user.data()?.displayName,
        avatar: user.data()?.avatar,
        joinedAt: now,
        cardCount: 7,
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

    // Create simple hand with playable cards
    await db
      .collection("games")
      .doc(gameId)
      .collection("playerHands")
      .doc(playerId)
      .set({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "blue", value: 5 },
          { kind: "wild", value: "wild" },
          { kind: "number", color: "red", value: 8 },
          { kind: "number", color: "blue", value: 2 },
          { kind: "number", color: "green", value: 7 },
          { kind: "special", color: "yellow", value: "skip" },
        ],
      });
  }
};

describe("playCard integration tests", () => {
  test("should play a valid card and update game state", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Play red 3 (matches red 5 on discard pile)
    await playCard("game1", "player1", 0);

    // Verify hand decreased
    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    expect(handDoc.data()?.hand.length).toBe(6);

    // Verify discard pile updated
    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.discardPile.length).toBe(2);
  });

  test("should handle wild card with color selection", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Play wild card (index 2) with blue color
    await playCard("game1", "player1", 2, "blue");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentColor).toBe("blue");
  });

  test("should detect winner when last card played", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set player1 to have only 1 card
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({ hand: [{ kind: "number", color: "red", value: 3 }] });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 1 });

    const result = await playCard("game1", "player1", 0);

    expect(result.winner).toBe("player1");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.status).toBe("completed");
  });

  test("should block Wild Draw Four stacking with standard rules", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set game state: Wild Draw Four was just played
    await db
      .collection("games")
      .doc("game1")
      .update({
        "state.discardPile": [
          { kind: "number", color: "red", value: 5 },
          { kind: "wild", value: "wild_draw4" },
        ],
        "state.currentColor": "blue",
        "state.mustDraw": 4,
        "state.currentTurnPlayerId": "player2",
      });

    // Give player2 a Wild Draw Four card
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "blue", value: 3 },
          { kind: "number", color: "red", value: 7 },
        ],
      });

    // Attempt to play Wild Draw Four (stacking) - should fail with standard rules
    await expect(playCard("game1", "player2", 0, "green")).rejects.toThrow(
      "Card cannot be played",
    );

    // Verify game state unchanged
    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(4);
    expect(gameDoc.data()?.state.discardPile.length).toBe(2);
  });

  test("should allow Wild Draw Four stacking with stacking house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Enable stacking house rule
    await db
      .collection("games")
      .doc("game1")
      .update({
        "config.houseRules": ["stacking"],
        "state.discardPile": [
          { kind: "number", color: "red", value: 5 },
          { kind: "wild", value: "wild_draw4" },
        ],
        "state.currentColor": "blue",
        "state.mustDraw": 4,
        "state.currentTurnPlayerId": "player2",
      });

    // Give player2 a Wild Draw Four card
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "blue", value: 3 },
          { kind: "number", color: "red", value: 7 },
        ],
      });

    // Play Wild Draw Four (stacking) - should succeed with house rule
    await playCard("game1", "player2", 0, "green");

    // Verify stacking worked
    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(8); // 4 + 4
    expect(gameDoc.data()?.state.discardPile.length).toBe(3);
    expect(gameDoc.data()?.state.currentColor).toBe("green");
  });
});

describe("drawCard integration tests", () => {
  test("should draw cards and update hand", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    const result = await drawCard("game1", "player1", 2);

    expect(result.cards).toHaveLength(2);

    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    expect(handDoc.data()?.hand.length).toBe(9);
  });

  test("should fulfill draw penalty", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    await db.collection("games").doc("game1").update({
      "state.mustDraw": 2,
    });

    await drawCard("game1", "player1", 2);

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(0);
  });

  test("should advance turn after penalty draw", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set a draw penalty
    await db.collection("games").doc("game1").update({
      "state.mustDraw": 2,
    });

    await drawCard("game1", "player1", 1);

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player2");
  });

  test("should NOT advance turn after normal draw", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    await drawCard("game1", "player1", 1);

    const gameDoc = await db.collection("games").doc("game1").get();
    // Turn should stay with player1 so they can play the drawn card
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player1");
  });
});

describe("passTurn integration tests", () => {
  test("should pass turn to next player", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    await passTurn("game1", "player1");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player2");
  });

  test("should reject pass when draw penalty is active", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    await db.collection("games").doc("game1").update({
      "state.mustDraw": 2,
    });

    await expect(passTurn("game1", "player1")).rejects.toThrow(
      "must draw cards",
    );
  });
});

describe("draw-then-play integration tests", () => {
  test("should allow playing a drawn card immediately", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set up game state with a specific discard pile
    await db
      .collection("games")
      .doc("game1")
      .update({
        "state.discardPile": [{ kind: "number", color: "blue", value: 7 }],
      });

    // Clear player1's hand so they have no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .set({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "yellow", value: 8 },
        ],
      });
    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 2 });

    // Step 1: Draw a card (normal draw, not penalty)
    const drawResult = await drawCard("game1", "player1", 1);
    expect(drawResult.cards).toHaveLength(1);

    // Verify turn stayed with player1
    let gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player1");

    // Verify hand now has 3 cards
    let handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    expect(handDoc.data()?.hand.length).toBe(3);

    // Step 2: Play the drawn card (assume it's the last card in hand, index 2)
    // In a real scenario, we'd check if the drawn card is playable first
    // For this test, we'll manually set a playable drawn card
    const drawnCard = { kind: "number", color: "blue", value: 5 };
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "yellow", value: 8 },
          drawnCard, // playable because it matches color
        ],
      });

    await playCard("game1", "player1", 2);

    // Verify turn advanced to player2 after playing
    gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player2");

    // Verify card was played (hand back to 2 cards)
    handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    expect(handDoc.data()?.hand.length).toBe(2);

    // Verify the drawn card is on discard pile
    expect(gameDoc.data()?.state.discardPile).toContainEqual(drawnCard);
  });

  test("should allow passing turn after drawing unplayable card", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set up initial hand with no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .set({
        hand: [
          { kind: "number", color: "yellow", value: 3 },
          { kind: "number", color: "green", value: 8 },
        ],
      });

    // Step 1: Draw a card
    await drawCard("game1", "player1", 1);

    // Verify turn stayed with player1
    let gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player1");

    // Step 2: Pass turn (player chose not to play or drawn card was unplayable)
    await passTurn("game1", "player1");

    // Verify turn advanced to player2
    gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player2");

    // Verify hand still has 3 cards (original 2 + drawn 1)
    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    expect(handDoc.data()?.hand.length).toBe(3);
  });

  test("should not allow passing during penalty draw", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set a draw penalty
    await db.collection("games").doc("game1").update({
      "state.mustDraw": 2,
    });

    // Player must draw penalty cards, cannot pass
    await expect(passTurn("game1", "player1")).rejects.toThrow(
      "must draw cards",
    );
  });

  test("should advance turn automatically after penalty draw", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set up a Draw Two penalty
    await db
      .collection("games")
      .doc("game1")
      .update({
        "state.mustDraw": 2,
        "state.discardPile": [
          { kind: "special", color: "red", value: "draw2" },
        ],
      });

    // Draw penalty cards
    await drawCard("game1", "player1", 1);

    // Verify turn automatically advanced to player2 (penalty draw)
    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.currentTurnPlayerId).toBe("player2");

    // Verify penalty was cleared
    expect(gameDoc.data()?.state.mustDraw).toBe(0);
  });

  test("should increment turnsPlayed correctly for normal draw-then-pass", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    const initialPlayerDoc = await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .get();
    const initialTurnsPlayed =
      initialPlayerDoc.data()?.gameStats.turnsPlayed || 0;

    // Normal draw (doesn't increment turnsPlayed)
    await drawCard("game1", "player1", 1);

    let playerDoc = await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .get();
    expect(playerDoc.data()?.gameStats.turnsPlayed).toBe(initialTurnsPlayed);

    // Pass turn (increments turnsPlayed)
    await passTurn("game1", "player1");

    playerDoc = await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .get();
    expect(playerDoc.data()?.gameStats.turnsPlayed).toBe(
      initialTurnsPlayed + 1,
    );
  });
});

describe("callUno integration tests", () => {
  test("should set hasCalledUno flag when calling for self", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Set player1 to have exactly 1 card (triggers self-call logic)
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({ hand: [{ kind: "number", color: "red", value: 5 }] });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 1, mustCallUno: true });

    await callUno("game1", "player1");

    const playerDoc = await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .get();
    expect(playerDoc.data()?.hasCalledUno).toBe(true);
    expect(playerDoc.data()?.mustCallUno).toBe(false);
  });

  test("should catch opponent who forgot UNO", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Player1 must have more than 1 card (otherwise triggers self-call)
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "blue", value: 5 },
        ],
      });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 2 });

    // Player2 has 1 card and forgot to call UNO
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({ hand: [{ kind: "number", color: "red", value: 5 }] });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player2")
      .update({ cardCount: 1, mustCallUno: true, hasCalledUno: false });

    const result = await callUno("game1", "player1");

    expect(result.caughtPlayerId).toBe("player2");

    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .get();
    expect(handDoc.data()?.hand.length).toBe(3); // 1 + 2 penalty
  });

  test("should not catch if already called UNO", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createInProgressGame("game1", ["player1", "player2"]);

    // Player1 calls UNO for themselves (has 1 card)
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({ hand: [{ kind: "number", color: "red", value: 5 }] });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 1, mustCallUno: true });

    const result = await callUno("game1", "player1");

    // No one caught because player1 is calling for themselves
    expect(result.caughtPlayerId).toBeUndefined();

    const playerDoc = await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .get();
    expect(playerDoc.data()?.hasCalledUno).toBe(true);
  });
});
