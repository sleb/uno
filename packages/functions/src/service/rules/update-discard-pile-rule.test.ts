import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { RuleContext } from "./types";
import { createUpdateDiscardPileRule } from "./update-discard-pile-rule";

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
      discardPile: [{ kind: "number", color: "red", value: 3 }],
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
  transaction: {} as any,
  now: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("update-discard-pile-rule", () => {
  const rule = createUpdateDiscardPileRule();

  test("should handle play action", () => {
    const ctx = createMockContext();
    expect(rule.canHandle(ctx)).toBe(true);
  });

  test("should not handle draw action", () => {
    const ctx = createMockContext({ action: { type: "draw", count: 1 } });
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("should add played card to discard pile", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].type).toBe("update-game");
    if (result.effects[0].type === "update-game") {
      const updatedPile = result.effects[0].updates["state.discardPile"];
      expect(updatedPile).toHaveLength(2);
      expect(updatedPile[1]).toEqual({
        kind: "number",
        color: "red",
        value: 5,
      });
    }
  });

  test("should keep game in progress when player has cards remaining", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.status"]).toBe(
        GAME_STATUSES.IN_PROGRESS,
      );
    }
  });

  test("should set status to completed when player wins", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }], // Last card
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.status"]).toBe(
        GAME_STATUSES.COMPLETED,
      );
    }
  });

  test("should update lastActivityAt timestamp", () => {
    const ctx = createMockContext();
    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates.lastActivityAt).toBe(ctx.now);
    }
  });
});
