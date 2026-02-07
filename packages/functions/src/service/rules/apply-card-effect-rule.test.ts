import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import { createApplyCardEffectRule } from "./apply-card-effect-rule";
import type { RuleContext } from "./types";

const createMockContext = (
  overrides: Partial<RuleContext> = {},
): RuleContext => ({
  gameId: "game1",
  playerId: "player1",
  action: { type: "play", cardIndex: 0 },
  game: {
    id: "game1",
    players: ["player1", "player2", "player3"],
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
  player: { cardCount: 7 } as GamePlayerData,
  playerHand: {
    hand: [
      { kind: "number", color: "red", value: 5 },
      { kind: "number", color: "blue", value: 3 },
    ],
  } as PlayerHandData,
  playerHands: {},
  transaction: {} as any,
  now: new Date().toISOString(),
  ...overrides,
});

describe("apply-card-effect-rule", () => {
  const rule = createApplyCardEffectRule();

  test("should handle play action", () => {
    const ctx = createMockContext();
    expect(rule.canHandle(ctx)).toBe(true);
  });

  test("should not handle draw action", () => {
    const ctx = createMockContext({ action: { type: "draw", count: 1 } });
    expect(rule.canHandle(ctx)).toBe(false);
  });

  test("should calculate next player for normal card", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].type).toBe("update-game");
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBe(
        "player2",
      );
      expect(result.effects[0].updates["state.direction"]).toBe(1);
      expect(result.effects[0].updates["state.mustDraw"]).toBe(0);
      expect(result.effects[0].updates["state.currentColor"]).toBeNull();
    }
  });

  test("should calculate next player for skip card", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "special", color: "red", value: "skip" }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBe(
        "player3",
      ); // Skips player2
    }
  });

  test("should handle reverse card", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "special", color: "red", value: "reverse" }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.direction"]).toBe(-1);
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBe(
        "player3",
      ); // Direction reversed
    }
  });

  test("should handle reverse in 2-player game as skip", () => {
    const ctx = createMockContext({
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
      playerHand: {
        hand: [{ kind: "special", color: "red", value: "reverse" }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBe(
        "player1",
      ); // Skip back to player1
      expect(result.effects[0].updates["state.direction"]).toBe(-1);
    }
  });

  test("should handle Draw Two card", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "special", color: "red", value: "draw-two" }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.mustDraw"]).toBe(2);
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBe(
        "player2",
      );
    }
  });

  test("should set currentColor for wild card", () => {
    const ctx = createMockContext({
      action: { type: "play", cardIndex: 0, chosenColor: "blue" },
      playerHand: {
        hand: [{ kind: "wild", value: "wild" }],
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.currentColor"]).toBe("blue");
    }
  });

  test("should set currentTurnPlayerId to null when player wins", () => {
    const ctx = createMockContext({
      playerHand: {
        hand: [{ kind: "number", color: "red", value: 5 }], // Last card
      } as PlayerHandData,
    });

    const result = rule.apply(ctx);

    expect(result.effects).toHaveLength(1);
    if (result.effects[0].type === "update-game") {
      expect(result.effects[0].updates["state.currentTurnPlayerId"]).toBeNull();
    }
  });
});
