import { describe, expect, test } from "bun:test";
import type { Card } from "@uno/shared";
import { detectEffectConflicts } from "./game-service";
import type { RuleEffect } from "./rules";

describe("detectEffectConflicts", () => {
  test("allows equal game updates from multiple rules", () => {
    const effects: RuleEffect[] = [
      {
        type: "update-game",
        updates: { "state.mustDraw": 2 },
        sourceRule: "rule-a",
      },
      {
        type: "update-game",
        updates: { "state.mustDraw": 2 },
        sourceRule: "rule-b",
      },
    ];

    const result = detectEffectConflicts(effects);

    expect(result.gameUpdates["state.mustDraw"]).toBe(2);
  });

  test("throws on conflicting game updates with different values", () => {
    const effects: RuleEffect[] = [
      {
        type: "update-game",
        updates: { "state.mustDraw": 2 },
        sourceRule: "rule-a",
      },
      {
        type: "update-game",
        updates: { "state.mustDraw": 4 },
        sourceRule: "rule-b",
      },
    ];

    expect(() => detectEffectConflicts(effects)).toThrow(/rule-a/);
  });

  test("throws on conflicting player updates with different values", () => {
    const effects: RuleEffect[] = [
      {
        type: "update-player",
        playerId: "player-1",
        updates: { cardCount: 3 },
        sourceRule: "rule-a",
      },
      {
        type: "update-player",
        playerId: "player-1",
        updates: { cardCount: 4 },
        sourceRule: "rule-b",
      },
    ];

    expect(() => detectEffectConflicts(effects)).toThrow(/players\[player-1\]/);
  });

  test("allows identical hand updates from multiple rules", () => {
    const redOne: Card = { kind: "number", color: "red", value: 1 };
    const effects: RuleEffect[] = [
      {
        type: "update-hand",
        playerId: "player-1",
        hand: [redOne],
        sourceRule: "rule-a",
      },
      {
        type: "update-hand",
        playerId: "player-1",
        hand: [redOne],
        sourceRule: "rule-b",
      },
    ];

    const result = detectEffectConflicts(effects);

    expect(result.handUpdates["player-1"]).toEqual([redOne]);
  });

  test("throws on conflicting hand updates with different values", () => {
    const redOne: Card = { kind: "number", color: "red", value: 1 };
    const blueTwo: Card = { kind: "number", color: "blue", value: 2 };
    const effects: RuleEffect[] = [
      {
        type: "update-hand",
        playerId: "player-1",
        hand: [redOne],
        sourceRule: "rule-a",
      },
      {
        type: "update-hand",
        playerId: "player-1",
        hand: [blueTwo],
        sourceRule: "rule-b",
      },
    ];

    expect(() => detectEffectConflicts(effects)).toThrow(
      /playerHands\[player-1\]/,
    );
  });
});
