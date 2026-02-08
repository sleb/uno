import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import { createFinalizeGameRule } from "./finalize-game-rule";
import type { RuleContext } from "./types";

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
  player: { cardCount: 2 } as GamePlayerData,
  playerHand: {
    hand: [
      { kind: "number", color: "red", value: 5 },
      { kind: "number", color: "blue", value: 7 },
    ],
  } as PlayerHandData,
  playerHands: {},
  transaction: {} as Transaction,
  now: new Date().toISOString(),
  ...overrides,
});

describe("finalize-game-rule", () => {
  const rule = createFinalizeGameRule();

  test("should handle play action when player wins", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }], // Last card
      } as PlayerHandData,
    });
    expect(rule.canHandle(ctx)).toBe(true);
  });

  test("should not handle when player has cards remaining", () => {
    const ctx = createMockContext();
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("should not handle draw action", () => {
    const ctx = createMockContext({
      action: { type: "draw", count: 1 },
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }],
      } as PlayerHandData,
    });
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("apply should return empty effects (work done in finalize)", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }],
      } as PlayerHandData,
    });
    const result = rule.apply(ctx);
    expect(result.effects).toHaveLength(0);
  });
});
