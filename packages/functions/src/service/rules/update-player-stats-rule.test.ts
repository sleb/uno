import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import type { RuleContext } from "./types";
import { createUpdatePlayerStatsRule } from "./update-player-stats-rule";

const createMockContext = (
  overrides: Partial<RuleContext> = {},
): RuleContext => ({
  gameId: "game1",
  playerId: "player1",
  action: { type: "play", cardIndex: 0 },
  game: {
    id: "game1",
    players: ["player1", "player2"],
    state: {
      status: "in-progress",
      currentTurnPlayerId: "player1",
      direction: 1,
      mustDraw: 0,
      currentColor: null,
      discardPile: [],
      deckSeed: "seed",
    },
  } as GameData,
  player: {
    cardCount: 3,
    gameStats: {
      cardsPlayed: 5,
      turnsPlayed: 8,
      specialCardsPlayed: 2,
      cardsDrawn: 3,
    },
  } as GamePlayerData,
  playerHand: {
    hand: [
      { kind: "number", color: "red", value: 5 },
      { kind: "number", color: "blue", value: 7 },
      { kind: "special", color: "green", value: "skip" },
    ],
  } as PlayerHandData,
  playerHands: {},
  transaction: {} as Transaction,
  now: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("update-player-stats-rule", () => {
  const rule = createUpdatePlayerStatsRule();

  test("should handle play action", () => {
    const ctx = createMockContext();
    expect(rule.canHandle(ctx)).toBe(true);
  });

  test("should not handle draw action", () => {
    const ctx = createMockContext({ action: { type: "draw", count: 1 } });
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("should increment cardsPlayed", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates["gameStats.cardsPlayed"]).toBe(6);
    }
  });

  test("should increment turnsPlayed", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates["gameStats.turnsPlayed"]).toBe(9);
    }
  });

  test("should not increment specialCardsPlayed for number card", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates["gameStats.specialCardsPlayed"]).toBe(2);
    }
  });

  test("should increment specialCardsPlayed for special card", () => {
    const ctx = createMockContext({
      action: { type: "play", cardIndex: 2 },
    });
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates["gameStats.specialCardsPlayed"]).toBe(3);
    }
  });

  test("should increment specialCardsPlayed for wild card", () => {
    const ctx = createMockContext({
      action: { type: "play", cardIndex: 0, chosenColor: "red" },
      playerHand: {
        hand: [{ kind: "wild", value: "wild" }],
      } as PlayerHandData,
    });
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates["gameStats.specialCardsPlayed"]).toBe(3);
    }
  });

  test("should reset hasCalledUno", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates.hasCalledUno).toBe(false);
    }
  });

  test("should set mustCallUno to true when player has 1 card left", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [
          { kind: "number", color: "red", value: 5 },
          { kind: "number", color: "blue", value: 7 },
        ],
      } as PlayerHandData,
    });
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates.mustCallUno).toBe(true);
    }
  });

  test("should set mustCallUno to false when player has more than 1 card left", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates.mustCallUno).toBe(false);
    }
  });

  test("should set mustCallUno to false when player wins", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }],
      } as PlayerHandData,
    });
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates.mustCallUno).toBe(false);
    }
  });

  test("should update lastActionAt timestamp", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    if (result.effects[0].type === "update-player") {
      expect(result.effects[0].updates.lastActionAt).toBe(ctx.now);
    }
  });
});
