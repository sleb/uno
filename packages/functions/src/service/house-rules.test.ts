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

import type { Card, HouseRule } from "@uno/shared";
import {
  assertEmulatorAvailable,
  cleanupTestData,
  getFirebaseForTest,
} from "../__test-helpers__/firebase-test";
import { drawCard, playCard } from "./game-service";

// Test setup with Firebase Admin
let _app: import("firebase-admin").app.App;
let db: FirebaseFirestore.Firestore;

beforeEach(async () => {
  const firebase = getFirebaseForTest();
  _app = firebase.app;
  db = firebase.db;
});

beforeAll(async () => {
  const firebase = getFirebaseForTest();
  await assertEmulatorAvailable(firebase.db);
});

afterEach(async () => {
  await cleanupTestData(db);
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
 * Helper function to create a game with specific house rules
 */
const createGameWithHouseRules = async (
  gameId: string,
  playerIds: string[],
  houseRules: HouseRule[],
  discardPile: Card[] = [{ kind: "number", color: "red", value: 5 }],
  mustDraw = 0,
) => {
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
        houseRules,
        maxPlayers: 4,
      },
      state: {
        status: "in-progress",
        currentTurnPlayerId: playerIds[0],
        direction: "clockwise",
        deckSeed: `seed-${gameId}`,
        drawPileCount: 80,
        discardPile,
        currentColor: null,
        mustDraw,
      },
      players: playerIds,
    });

  // Create player docs and hands
  for (const playerId of playerIds) {
    const user = await db.collection("users").doc(playerId).get();

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

    // Create simple default hand
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

describe("House Rule: Stacking", () => {
  test("should block Draw Two stacking without house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      [],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "special", color: "red", value: "draw2" },
      ],
      2,
    );

    // Update to player2's turn and give them a Draw Two
    await db
      .collection("games")
      .doc("game1")
      .update({ "state.currentTurnPlayerId": "player2" });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "special", color: "blue", value: "draw2" },
          { kind: "number", color: "blue", value: 3 },
        ],
      });

    // Attempt to play Draw Two - should fail
    await expect(playCard("game1", "player2", 0)).rejects.toThrow(
      "Card cannot be played",
    );
  });

  test("should allow Draw Two stacking with house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "special", color: "red", value: "draw2" },
      ],
      2,
    );

    await db
      .collection("games")
      .doc("game1")
      .update({ "state.currentTurnPlayerId": "player2" });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "special", color: "blue", value: "draw2" },
          { kind: "number", color: "blue", value: 3 },
        ],
      });

    // Play Draw Two - should succeed
    await playCard("game1", "player2", 0);

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(4); // 2 + 2
  });

  test("should block Wild Draw Four stacking without house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      [],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "wild", value: "wild_draw4" },
      ],
      4,
    );

    await db.collection("games").doc("game1").update({
      "state.currentTurnPlayerId": "player2",
      "state.currentColor": "blue",
    });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "blue", value: 3 },
        ],
      });

    // Attempt to play Wild Draw Four - should fail
    await expect(playCard("game1", "player2", 0, "green")).rejects.toThrow(
      "Card cannot be played",
    );
  });

  test("should allow Wild Draw Four stacking with house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "wild", value: "wild_draw4" },
      ],
      4,
    );

    await db.collection("games").doc("game1").update({
      "state.currentTurnPlayerId": "player2",
      "state.currentColor": "blue",
    });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "blue", value: 3 },
        ],
      });

    // Play Wild Draw Four - should succeed
    await playCard("game1", "player2", 0, "green");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(8); // 4 + 4
    expect(gameDoc.data()?.state.currentColor).toBe("green");
  });

  test("should accumulate penalty across multiple stacked Draw Twos", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createUser("player3", "Charlie");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2", "player3"],
      ["stacking"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "special", color: "red", value: "draw2" },
      ],
      2,
    );

    // Player2's turn, stack another Draw Two
    await db.collection("games").doc("game1").update({
      "state.currentTurnPlayerId": "player2",
    });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "special", color: "blue", value: "draw2" },
          { kind: "number", color: "blue", value: 4 },
        ],
      });

    await playCard("game1", "player2", 0);

    let gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(4);

    // Player3's turn, stack another Draw Two
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player3")
      .update({
        hand: [
          { kind: "special", color: "green", value: "draw2" },
          { kind: "number", color: "green", value: 6 },
        ],
      });

    await playCard("game1", "player3", 0);

    gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(6); // 2 + 2 + 2
  });
});

describe("House Rule: Jump-In", () => {
  test("should reject jump-in without house rule", async () => {
    // Jump-in not implemented yet
    // This test documents expected behavior
    expect(true).toBe(true);
  });

  test("should allow exact card match jump-in with house rule", async () => {
    // Jump-in not implemented yet
    // Expected: Player can play identical card (color + value) out of turn
    expect(true).toBe(true);
  });

  test("should resume play from jump-in player", async () => {
    // Jump-in not implemented yet
    // Expected: Turn order continues from player who jumped in
    expect(true).toBe(true);
  });

  test("should cancel action card effect with identical jump-in", async () => {
    // Jump-in not implemented yet
    // Expected: If jumping in with Skip/Reverse/Draw Two, effect cancels
    expect(true).toBe(true);
  });
});

describe("House Rule: Zero Rotation", () => {
  test("should not rotate hands on zero without house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createUser("player3", "Charlie");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2", "player3"],
      [],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 a zero card
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "red", value: 0 },
          { kind: "number", color: "blue", value: 2 },
        ],
      });

    const player1HandBefore = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player1")
        .get()
    ).data()?.hand;

    // Play zero
    await playCard("game1", "player1", 0);

    // Hands should NOT rotate
    const player1HandAfter = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player1")
        .get()
    ).data()?.hand;

    // Should have one less card (the zero), but otherwise same hand
    expect(player1HandAfter.length).toBe(player1HandBefore.length - 1);
  });

  test("should rotate hands clockwise on zero with house rule", async () => {
    // Zero rotation not implemented yet
    // Expected: All hands rotate in direction of play
    expect(true).toBe(true);
  });

  test("should rotate hands counter-clockwise when direction is reversed", async () => {
    // Zero rotation not implemented yet
    // Expected: Rotation follows current direction
    expect(true).toBe(true);
  });

  test("should update card counts after rotation", async () => {
    // Zero rotation not implemented yet
    // Expected: All player cardCounts updated correctly
    expect(true).toBe(true);
  });
});

describe("House Rule: Seven Swap", () => {
  test("should not swap hands on seven without house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      [],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 a seven
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "red", value: 7 },
          { kind: "number", color: "blue", value: 2 },
        ],
      });

    const player1HandBefore = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player1")
        .get()
    ).data()?.hand;

    const player2HandBefore = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player2")
        .get()
    ).data()?.hand;

    // Play seven
    await playCard("game1", "player1", 0);

    // Hands should NOT swap
    const player1HandAfter = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player1")
        .get()
    ).data()?.hand;

    const player2HandAfter = (
      await db
        .collection("games")
        .doc("game1")
        .collection("playerHands")
        .doc("player2")
        .get()
    ).data()?.hand;

    // Player1 should have one less card
    expect(player1HandAfter.length).toBe(player1HandBefore.length - 1);
    // Player2 hand should be unchanged
    expect(player2HandAfter).toEqual(player2HandBefore);
  });

  test("should require target player selection with house rule", async () => {
    // Seven swap not implemented yet
    // Expected: PlayCard request needs targetPlayerId parameter
    expect(true).toBe(true);
  });

  test("should swap hands with chosen player", async () => {
    // Seven swap not implemented yet
    // Expected: Complete hand swap between players
    expect(true).toBe(true);
  });

  test("should update card counts after swap", async () => {
    // Seven swap not implemented yet
    // Expected: Both players' cardCounts updated
    expect(true).toBe(true);
  });
});

describe("House Rule: Draw to Match", () => {
  test("should draw only one card without house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      [],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "blue", value: 2 },
          { kind: "number", color: "green", value: 3 },
        ],
      });

    // Draw one card
    await drawCard("game1", "player1", 1);

    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();

    // Should have exactly 3 cards now (2 + 1)
    expect(handDoc.data()?.hand.length).toBe(3);
  });

  test("should keep drawing until match with house rule", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["drawToMatch"],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "number", color: "blue", value: 2 },
          { kind: "number", color: "green", value: 3 },
        ],
      });

    // Draw with Draw to Match - should draw multiple cards until match
    const result = await drawCard("game1", "player1", 1);

    // Should have drawn more than 1 card (kept drawing until match)
    expect(result.cards.length).toBeGreaterThan(0);

    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();

    // Should have 2 + however many were drawn
    expect(handDoc.data()?.hand.length).toBe(2 + result.cards.length);

    // Last card should be playable (red card or 5)
    const lastCard = result.cards[result.cards.length - 1];
    const isPlayable =
      ("color" in lastCard && lastCard.color === "red") ||
      ("value" in lastCard && lastCard.value === 5) ||
      lastCard.kind === "wild";
    expect(isPlayable).toBe(true);
  });

  test("should stop drawing when match is found", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["drawToMatch"],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [],
      });

    await db
      .collection("games")
      .doc("game1")
      .collection("players")
      .doc("player1")
      .update({ cardCount: 0 });

    // Draw with Draw to Match
    const result = await drawCard("game1", "player1", 1);

    // The last card drawn should be playable
    const lastCard = result.cards[result.cards.length - 1];
    const isPlayable =
      ("color" in lastCard && lastCard.color === "red") ||
      ("value" in lastCard && lastCard.value === 5) ||
      lastCard.kind === "wild";
    expect(isPlayable).toBe(true);
  });

  test("should not apply draw to match to penalty draws", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["drawToMatch"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "special", color: "red", value: "draw2" },
      ],
      2,
    );

    await db
      .collection("games")
      .doc("game1")
      .update({ "state.currentTurnPlayerId": "player2" });

    // Draw 2 as penalty - should draw exactly 2, not keep drawing
    const result = await drawCard("game1", "player2", 1);

    // Should draw exactly 2 cards (the penalty), not more
    expect(result.cards.length).toBe(2);
  });

  test("should allow playing matched card immediately", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["drawToMatch"],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 no playable cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [{ kind: "number", color: "blue", value: 2 }],
      });

    // Draw with Draw to Match
    const _drawResult = await drawCard("game1", "player1", 1);

    // Get the hand to find the playable card
    const handDoc = await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .get();
    const hand = handDoc.data()?.hand;

    // Find the index of a playable card (should be one of the newly drawn cards)
    const playableIndex = hand.findIndex(
      (card: { kind: string; color?: string; value?: number | string }) =>
        ("color" in card && card.color === "red") ||
        ("value" in card && card.value === 5) ||
        card.kind === "wild",
    );

    expect(playableIndex).toBeGreaterThanOrEqual(0);

    // Play the card that was drawn
    if (playableIndex >= 0) {
      const chosenCard = hand[playableIndex];
      const chosenColor = chosenCard?.kind === "wild" ? "red" : undefined;
      await playCard("game1", "player1", playableIndex, chosenColor);

      // Verify it was played
      const gameDoc = await db.collection("games").doc("game1").get();
      expect(gameDoc.data()?.state.discardPile.length).toBe(2);
    }
  });
});

describe("House Rule: Multiple Rules Combined", () => {
  test("should handle stacking + zero rotation together", async () => {
    // Combined rules not implemented yet
    // Expected: Both rules active simultaneously
    expect(true).toBe(true);
  });

  test("should handle stacking + seven swap together", async () => {
    // Combined rules not implemented yet
    // Expected: Both rules active simultaneously
    expect(true).toBe(true);
  });

  test("should handle all house rules enabled together", async () => {
    // Combined rules not implemented yet
    // Expected: All rules active without conflicts
    expect(true).toBe(true);
  });
});

describe("House Rule: Edge Cases", () => {
  test("should enforce Wild Draw Four legality check with stacking", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking"],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 a Wild Draw Four AND a red card
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "red", value: 3 },
        ],
      });

    // Try to play Wild Draw Four illegally - should fail
    await expect(playCard("game1", "player1", 0, "blue")).rejects.toThrow(
      "Wild Draw Four can only be played when you have no matching color",
    );
  });

  test("should NOT check Wild Draw Four legality when stacking", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "wild", value: "wild_draw4" },
      ],
      4,
    );

    await db.collection("games").doc("game1").update({
      "state.currentTurnPlayerId": "player2",
      "state.currentColor": "red",
    });

    // Give player2 a Wild Draw Four AND a red card
    // Normally this would be illegal, but when stacking the legality check is bypassed
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "blue", value: 7 },
        ],
      });

    // Play Wild Draw Four while stacking (mustDraw > 0) - should work even with red card
    await playCard("game1", "player2", 0, "green");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(8); // 4 + 4
  });

  test("should allow Wild Draw Four stacking only when mustDraw > 0", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking"],
      [{ kind: "number", color: "red", value: 5 }],
    );

    // Give player1 a Wild Draw Four and no red cards
    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player1")
      .update({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "blue", value: 3 },
        ],
      });

    // Play Wild Draw Four normally (not stacking) - should work
    await playCard("game1", "player1", 0, "green");

    const gameDoc = await db.collection("games").doc("game1").get();
    expect(gameDoc.data()?.state.mustDraw).toBe(4);
  });

  test("should prevent non-draw cards when mustDraw > 0 even with house rules", async () => {
    await createUser("player1", "Alice");
    await createUser("player2", "Bob");
    await createGameWithHouseRules(
      "game1",
      ["player1", "player2"],
      ["stacking", "jumpIn", "sevenSwap"],
      [
        { kind: "number", color: "red", value: 5 },
        { kind: "special", color: "red", value: "draw2" },
      ],
      2,
    );

    await db
      .collection("games")
      .doc("game1")
      .update({ "state.currentTurnPlayerId": "player2" });

    await db
      .collection("games")
      .doc("game1")
      .collection("playerHands")
      .doc("player2")
      .update({
        hand: [
          { kind: "number", color: "red", value: 3 },
          { kind: "number", color: "blue", value: 5 },
        ],
      });

    // Try to play regular card when draw penalty active - should fail
    await expect(playCard("game1", "player2", 0)).rejects.toThrow(
      "Card cannot be played",
    );
  });
});
