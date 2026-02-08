import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { validateEffect } from "./effect-validation";

const setStrictValidation = () => {
  process.env.UNO_STRICT_RULE_VALIDATION = "true";
};

const clearStrictValidation = (previous: string | undefined) => {
  if (previous === undefined) {
    delete process.env.UNO_STRICT_RULE_VALIDATION;
    return;
  }
  process.env.UNO_STRICT_RULE_VALIDATION = previous;
};

describe("effect validation", () => {
  let previousStrict: string | undefined;

  beforeEach(() => {
    previousStrict = process.env.UNO_STRICT_RULE_VALIDATION;
    setStrictValidation();
  });

  afterEach(() => {
    clearStrictValidation(previousStrict);
  });

  test("throws on invalid update-hand payload", () => {
    const effect = {
      type: "update-hand",
      playerId: "player-1",
      hand: [{ kind: "number", color: "purple", value: 5 }],
    };

    expect(() => validateEffect(effect)).toThrow(/Invalid hand update/);
  });

  test("throws on invalid set-winner payload", () => {
    const effect = {
      type: "set-winner",
      winnerId: "player-1",
      preFetchedData: {
        game: {},
        playerHands: {},
        gamePlayers: {},
        userDataMap: {},
      },
    };

    expect(() => validateEffect(effect)).toThrow(/Invalid set-winner effect/);
  });

  test("throws on invalid emit-events payload", () => {
    const effect = {
      type: "emit-events",
      events: [{ type: "notify", payload: "bad" }],
    };

    expect(() => validateEffect(effect)).toThrow(/Invalid emit-events effect/);
  });

  test("throws on unknown game field in strict mode", () => {
    const effect = {
      type: "update-game",
      updates: { "state.unknownField": 1 },
    };

    expect(() => validateEffect(effect)).toThrow(/Unknown game field/);
  });
});
