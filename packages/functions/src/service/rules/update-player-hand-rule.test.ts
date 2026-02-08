import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import type { RuleContext } from "./types";
import { createUpdatePlayerHandRule } from "./update-player-hand-rule";

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
  player: { cardCount: 3 } as GamePlayerData,
  playerHand: {
    hand: [
      { kind: "number", color: "red", value: 5 },
      { kind: "number", color: "blue", value: 7 },
      { kind: "special", color: "green", value: "skip" },
    ],
  } as PlayerHandData,
  playerHands: {},
  transaction: {} as Transaction,
  now: new Date().toISOString(),
  ...overrides,
});

describe("update-player-hand-rule", () => {
  const rule = createUpdatePlayerHandRule();

  test("should handle play action", () => {
    const ctx = createMockContext();
    expect(rule.canHandle(ctx)).toBe(true);
  });

  test("should not handle draw action", () => {
    const ctx = createMockContext({ action: { type: "draw", count: 1 } });
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("should remove played card from hand", () => {
    const ctx = createMockContext({ action: { type: "play", cardIndex: 1 } });
    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(2);
    const handEffect = result.effects.find((e) => e.type === "update-hand");
    expect(handEffect).toBeDefined();
    if (handEffect?.type === "update-hand") {
      expect(handEffect.hand).toHaveLength(2);
      expect(handEffect.hand[0]).toEqual({
        kind: "number",
        color: "red",
        value: 5,
      });
      expect(handEffect.hand[1]).toEqual({
        kind: "special",
        color: "green",
        value: "skip",
      });
    }
  });

  test("should update cardCount", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    const playerEffect = result.effects.find((e) => e.type === "update-player");
    expect(playerEffect).toBeDefined();
    if (playerEffect?.type === "update-player") {
      expect(playerEffect.updates.cardCount).toBe(2);
    }
  });

  test("should set status to active when player has cards remaining", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    const playerEffect = result.effects.find((e) => e.type === "update-player");
    if (playerEffect?.type === "update-player") {
      expect(playerEffect.updates.status).toBe("active");
    }
  });

  test("should set status to winner when player has no cards remaining", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }], // Last card
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    const playerEffect = result.effects.find((e) => e.type === "update-player");
    if (playerEffect?.type === "update-player") {
      expect(playerEffect.updates.status).toBe("winner");
      expect(playerEffect.updates.cardCount).toBe(0);
    }
  });

  test("should include playerId in effects", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    const handEffect = result.effects.find((e) => e.type === "update-hand");
    const playerEffect = result.effects.find((e) => e.type === "update-player");

    if (handEffect?.type === "update-hand") {
      expect(handEffect.playerId).toBe("player1");
    }
    if (playerEffect?.type === "update-player") {
      expect(playerEffect.playerId).toBe("player1");
    }
  });
});
