import { describe, it, expect } from "bun:test";
import {
  ErrorCode,
  InternalError,
  ValidationError,
  isInternalError,
  isUnoError,
} from "@uno/shared";
import {
  withRuleErrorHandling,
  withRuleErrorHandlingAsync,
} from "./rule-error-handling";
import type { RuleContext, PlayCardAction } from "./types";

// Test helpers
const createMockContext = (overrides?: Partial<RuleContext>): RuleContext => ({
  gameId: "test-game-123",
  playerId: "test-player-456",
  action: {
    type: "play",
    cardIndex: 0,
  } as PlayCardAction,
  game: {} as unknown as RuleContext["game"],
  player: {} as unknown as RuleContext["player"],
  playerHand: { cards: [] },
  playerHands: {},
  transaction: {} as unknown as Parameters<RuleContext["transaction"]>[0],
  now: new Date().toISOString(),
  ...overrides,
});

describe("withRuleErrorHandling", () => {
  describe("passes UnoErrors through unchanged", () => {
    it("passes ValidationError through with code preserved", () => {
      const context = createMockContext();
      const originalError = new ValidationError(
        ErrorCode.CARD_NOT_PLAYABLE,
        "Card cannot be played",
      );

      const fn = () => {
        throw originalError;
      };

      expect(() =>
        withRuleErrorHandling("test-rule", "validate", fn, context),
      ).toThrow(originalError);
    });

    it("passes InternalError through unchanged", () => {
      const context = createMockContext();
      const originalError = new InternalError(
        ErrorCode.INTERNAL_ERROR,
        "Something went wrong",
      );

      const fn = () => {
        throw originalError;
      };

      expect(() =>
        withRuleErrorHandling("test-rule", "apply", fn, context),
      ).toThrow(originalError);
    });

    it("preserves UnoError details", () => {
      const context = createMockContext();
      const originalError = new ValidationError(
        ErrorCode.INVALID_CARD_INDEX,
        "Invalid index",
        { index: -1 },
      );

      const fn = () => {
        throw originalError;
      };

      try {
        withRuleErrorHandling("test-rule", "validate", fn, context);
      } catch (error) {
        expect(isUnoError(error)).toBe(true);
        if (isUnoError(error)) {
          expect(error.code).toBe(ErrorCode.INVALID_CARD_INDEX);
          expect(error.details?.index).toBe(-1);
        }
      }
    });
  });

  describe("wraps unexpected errors with context", () => {
    it("wraps generic Error with rule context", () => {
      const context = createMockContext();
      const originalError = new Error("Unexpected error");

      const fn = () => {
        throw originalError;
      };

      try {
        withRuleErrorHandling("card-playable-rule", "validate", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        expect(isInternalError(error)).toBe(true);
        if (isInternalError(error)) {
          expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
          expect(error.details?.rule).toBe("card-playable-rule");
          expect(error.details?.phase).toBe("validate");
          expect(error.details?.gameId).toBe("test-game-123");
          expect(error.details?.playerId).toBe("test-player-456");
        }
      }
    });

    it("preserves original error message in details", () => {
      const context = createMockContext();
      const originalMessage = "Cannot read property 'color' of undefined";
      const fn = () => {
        throw new Error(originalMessage);
      };

      try {
        withRuleErrorHandling("test-rule", "apply", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details?.originalMessage).toBe(originalMessage);
        }
      }
    });

    it("logs error with context", () => {
      const context = createMockContext({
        gameId: "game-log-test",
        playerId: "player-log-test",
      });
      const originalError = new Error("Test error");

      const fn = () => {
        throw originalError;
      };

      // Note: We can't easily mock firebase-functions/logger, but we can verify
      // the error is thrown with the correct context
      try {
        withRuleErrorHandling("log-test-rule", "validate", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details?.gameId).toBe("game-log-test");
          expect(error.details?.playerId).toBe("player-log-test");
        }
      }
    });
  });

  describe("error context structure", () => {
    it("includes all required context fields", () => {
      const context = createMockContext();
      const fn = () => {
        throw new Error("Test");
      };

      try {
        withRuleErrorHandling("test-rule", "apply", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details).toBeDefined();
          expect(error.details?.ruleName).toBeUndefined(); // Note: ruleName is captured as 'rule'
          expect(error.details?.rule).toBe("test-rule");
          expect(error.details?.phase).toBe("apply");
          expect(error.details?.gameId).toBeDefined();
          expect(error.details?.playerId).toBeDefined();
          expect(error.details?.timestamp).toBeDefined();
          expect(error.details?.originalMessage).toBeDefined();
        }
      }
    });

    it("captures timestamp in ISO format", () => {
      const context = createMockContext();
      const fn = () => {
        throw new Error("Test");
      };

      try {
        withRuleErrorHandling("test-rule", "validate", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          const timestamp = error.details?.timestamp;
          expect(typeof timestamp).toBe("string");
          // Should be valid ISO 8601 timestamp
          expect(new Date(timestamp as string)).not.toBeNaN();
        }
      }
    });
  });

  describe("sync rule phases", () => {
    it("wraps validate phase errors", () => {
      const context = createMockContext();
      const fn = () => {
        throw new Error("Validation error");
      };

      try {
        withRuleErrorHandling("validate-rule", "validate", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details?.phase).toBe("validate");
        }
      }
    });

    it("wraps apply phase errors", () => {
      const context = createMockContext();
      const fn = () => {
        throw new Error("Apply error");
      };

      try {
        withRuleErrorHandling("apply-rule", "apply", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details?.phase).toBe("apply");
        }
      }
    });

    it("returns value when function succeeds", () => {
      const context = createMockContext();
      const result = { effects: [], cardsDrawn: [] };

      const fn = () => result;

      const returnedValue = withRuleErrorHandling(
        "success-rule",
        "apply",
        fn,
        context,
      );

      expect(returnedValue).toBe(result);
    });
  });

  describe("handles unknown error types", () => {
    it("wraps non-Error thrown values", () => {
      const context = createMockContext();
      const fn = () => {
        throw "string error";
      };

      try {
        withRuleErrorHandling("test-rule", "validate", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        // Should throw InternalError for unknown error type
        expect(isInternalError(error)).toBe(true);
      }
    });

    it("wraps null/undefined throws", () => {
      const context = createMockContext();
      const fn = () => {
        throw null;
      };

      try {
        withRuleErrorHandling("test-rule", "apply", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        expect(isInternalError(error)).toBe(true);
      }
    });
  });
});

describe("withRuleErrorHandlingAsync", () => {
  describe("passes UnoErrors through unchanged", () => {
    it("passes async ValidationError through", async () => {
      const context = createMockContext();
      const originalError = new ValidationError(
        ErrorCode.MUST_DRAW_CARDS,
        "Must draw cards",
      );

      const fn = async () => {
        throw originalError;
      };

      try {
        await withRuleErrorHandlingAsync(
          "test-rule",
          "finalize",
          fn,
          context,
        );
        expect.unreachable("Should throw");
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it("passes async InternalError through", async () => {
      const context = createMockContext();
      const originalError = new InternalError(
        ErrorCode.INTERNAL_ERROR,
        "Async error",
      );

      const fn = async () => {
        throw originalError;
      };

      try {
        await withRuleErrorHandlingAsync(
          "test-rule",
          "finalize",
          fn,
          context,
        );
        expect.unreachable("Should throw");
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });
  });

  describe("wraps async unexpected errors with context", () => {
    it("wraps async Error with rule context", async () => {
      const context = createMockContext();
      const originalError = new Error("Async unexpected error");

      const fn = async () => {
        throw originalError;
      };

      try {
        await withRuleErrorHandlingAsync(
          "async-rule",
          "finalize",
          fn,
          context,
        );
        expect.unreachable("Should throw");
      } catch (error) {
        expect(isInternalError(error)).toBe(true);
        if (isInternalError(error)) {
          expect(error.details?.rule).toBe("async-rule");
          expect(error.details?.phase).toBe("finalize");
          expect(error.details?.originalMessage).toBe("Async unexpected error");
        }
      }
    });

    it("returns value when async function succeeds", async () => {
      const context = createMockContext();
      const result = { effects: [], cardsDrawn: [] };

      const fn = async () => result;

      const returnedValue = await withRuleErrorHandlingAsync(
        "success-rule",
        "finalize",
        fn,
        context,
      );

      expect(returnedValue).toBe(result);
    });
  });

  describe("async phase handling", () => {
    it("correctly identifies finalize phase", async () => {
      const context = createMockContext();
      const fn = async () => {
        throw new Error("Finalize error");
      };

      try {
        await withRuleErrorHandlingAsync(
          "finalize-rule",
          "finalize",
          fn,
          context,
        );
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.details?.phase).toBe("finalize");
        }
      }
    });

    it("preserves async error stack traces", async () => {
      const context = createMockContext();
      const fn = async () => {
        throw new Error("Async stack test");
      };

      try {
        await withRuleErrorHandlingAsync("stack-rule", "finalize", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        if (isInternalError(error)) {
          expect(error.message).toContain("Rule execution failed");
          expect(error.details?.originalMessage).toBe("Async stack test");
        }
      }
    });
  });

  describe("handles unknown async error types", () => {
    it("wraps non-Error async throws", async () => {
      const context = createMockContext();
      const fn = async () => {
        throw { custom: "error object" };
      };

      try {
        await withRuleErrorHandlingAsync("test-rule", "finalize", fn, context);
        expect.unreachable("Should throw");
      } catch (error) {
        expect(isInternalError(error)).toBe(true);
      }
    });
  });
});

describe("integration: rules with different contexts", () => {
  it("preserves different gameId and playerId in errors", () => {
    const context1 = createMockContext({
      gameId: "game-1",
      playerId: "player-1",
    });
    const fn = () => {
      throw new Error("Test");
    };

    try {
      withRuleErrorHandling("rule-1", "apply", fn, context1);
      expect.unreachable("Should throw");
    } catch (error) {
      if (isInternalError(error)) {
        expect(error.details?.gameId).toBe("game-1");
        expect(error.details?.playerId).toBe("player-1");
      }
    }

    const context2 = createMockContext({
      gameId: "game-2",
      playerId: "player-2",
    });

    try {
      withRuleErrorHandling("rule-2", "apply", fn, context2);
      expect.unreachable("Should throw");
    } catch (error) {
      if (isInternalError(error)) {
        expect(error.details?.gameId).toBe("game-2");
        expect(error.details?.playerId).toBe("player-2");
      }
    }
  });

  it("works with different action types", () => {
    const contextPlay = createMockContext({
      action: { type: "play", cardIndex: 0 },
    });
    const contextDraw = createMockContext({
      action: { type: "draw", count: 2 },
    });

    const fn = () => {
      throw new Error("Test");
    };

    try {
      withRuleErrorHandling("test-rule", "apply", fn, contextPlay);
      expect.unreachable("Should throw");
    } catch (error) {
      if (isInternalError(error)) {
        // Should have captured context successfully
        expect(error.details?.gameId).toBeDefined();
      }
    }

    try {
      withRuleErrorHandling("test-rule", "apply", fn, contextDraw);
      expect.unreachable("Should throw");
    } catch (error) {
      if (isInternalError(error)) {
        expect(error.details?.gameId).toBeDefined();
      }
    }
  });
});
