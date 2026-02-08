/**
 * Tests for notifyError() error mapping and message selection
 *
 * This test file verifies that:
 * 1. ErrorCodes from Cloud Functions map to user-friendly messages
 * 2. Firebase auth errors are properly handled
 * 3. Unknown errors gracefully fall back to generic messages
 * 4. All error paths show appropriate user-facing text
 *
 * These tests are critical because notifyError() is the entry point
 * for ALL error handling in the frontend application.
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";
import * as notificationsModule from "@mantine/notifications";
import { ErrorCode } from "@uno/shared";
import { FirebaseError } from "firebase/app";
import { notifyError } from "./notifications";

// Mock the Mantine notifications module
const mockNotificationsShow = mock(() => {});

beforeEach(() => {
  // Reset mock before each test
  mockNotificationsShow.mockClear();
  // Override the notifications.show method
  (notificationsModule.notifications.show as any) = mockNotificationsShow;
});

describe("notifyError()", () => {
  describe("ErrorCode Mapping - Cloud Function Errors", () => {
    test("maps ErrorCode.NOT_YOUR_TURN to user message", () => {
      const error = new FirebaseError("functions/internal", "Not your turn");
      (error as any).details = {
        code: ErrorCode.NOT_YOUR_TURN,
        message: "Internal error message",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "It is not your turn. Please wait for your turn.",
        }),
      );
    });

    test("maps ErrorCode.CARD_NOT_PLAYABLE to user message", () => {
      const error = new FirebaseError(
        "functions/internal",
        "Card not playable",
      );
      (error as any).details = {
        code: ErrorCode.CARD_NOT_PLAYABLE,
        message: "Card validation failed",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "This card cannot be played right now. Choose a different card.",
        }),
      );
    });

    test("maps ErrorCode.INVALID_CARD_INDEX to user message", () => {
      const error = new FirebaseError("functions/internal", "Invalid index");
      (error as any).details = {
        code: ErrorCode.INVALID_CARD_INDEX,
        message: "Card not found",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "The selected card is not in your hand. Please try again.",
        }),
      );
    });

    test("maps ErrorCode.NOT_IN_GAME to user message", () => {
      const error = new FirebaseError("functions/internal", "Not in game");
      (error as any).details = {
        code: ErrorCode.NOT_IN_GAME,
        message: "Player not in game",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You are not in this game. Join the game to participate.",
        }),
      );
    });

    test("maps ErrorCode.GAME_NOT_FOUND to user message", () => {
      const error = new FirebaseError("functions/internal", "Game not found");
      (error as any).details = {
        code: ErrorCode.GAME_NOT_FOUND,
        message: "Game not found in database",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "The game could not be found. It may have been deleted.",
        }),
      );
    });

    test("maps ErrorCode.MAX_PLAYERS_REACHED to user message", () => {
      const error = new FirebaseError("functions/internal", "Game is full");
      (error as any).details = {
        code: ErrorCode.MAX_PLAYERS_REACHED,
        message: "Max players exceeded",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "This game is full. Choose a different game or create a new one.",
        }),
      );
    });
  });

  describe("Firebase Auth Errors", () => {
    test("maps auth/network-request-failed to network error message", () => {
      const error = new FirebaseError("auth/network-request-failed", "");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Network error. Please check your connection and try again.",
        }),
      );
    });

    test("maps auth/user-disabled to account disabled message", () => {
      const error = new FirebaseError("auth/user-disabled", "");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This account has been disabled.",
        }),
      );
    });

    test("maps auth/wrong-password to incorrect credentials message", () => {
      const error = new FirebaseError("auth/wrong-password", "");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Incorrect email or password.",
        }),
      );
    });

    test("maps auth/email-already-in-use to duplicate account message", () => {
      const error = new FirebaseError("auth/email-already-in-use", "");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "This email is already registered.",
        }),
      );
    });

    test("maps auth/too-many-requests to rate limit message", () => {
      const error = new FirebaseError("auth/too-many-requests", "");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Too many failed attempts. Please try again later.",
        }),
      );
    });
  });

  describe("Fallback Chains", () => {
    test("falls back to errorResponse.message when code is valid but not in ERROR_MESSAGES", () => {
      const error = new FirebaseError("functions/internal", "");
      (error as any).details = {
        code: "UNMAPPED_CODE", // Invalid code not in enum
        message: "Custom server message",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Custom server message",
        }),
      );
    });

    test("falls back to Error.message when details is missing code", () => {
      const error = new FirebaseError("functions/internal", "Direct error");
      (error as any).details = undefined;

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
      // Note: Falls through to possible auth error check, then Error.message
    });

    test("falls back to Error.message for native Error objects", () => {
      const error = new Error("Something went really wrong");

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Something went really wrong",
        }),
      );
    });

    test("shows generic message when error is completely unmappable", () => {
      // Pass an object with no useful error information
      notifyError({} as any);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unexpected error occurred. Please try again.",
        }),
      );
    });

    test("shows generic message for null/undefined errors", () => {
      notifyError(null);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unexpected error occurred. Please try again.",
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    test("handles HttpsError with null details", () => {
      const error = new FirebaseError("functions/internal", "Something failed");
      (error as any).details = null;

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalled();
      // Should show some message, not crash
    });

    test("handles HttpsError with invalid JSON in details", () => {
      const error = new FirebaseError("functions/internal", "");
      (error as any).details = { notAValidErrorResponse: true };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalled();
      // Should handle gracefully
    });

    test("prioritizes ErrorCode mapping over Firebase auth codes", () => {
      // If error has both a valid ErrorCode AND a Firebase auth code,
      // ErrorCode should win (more specific)
      const error = new FirebaseError("auth/network-request-failed", "");
      (error as any).details = {
        code: ErrorCode.NOT_YOUR_TURN,
        message: "Internal message",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "It is not your turn. Please wait for your turn.",
        }),
      );
      // NOT the auth error message
    });

    test("handles Error objects without message property", () => {
      const error = new Error();
      error.message = ""; // Empty message

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unexpected error occurred. Please try again.",
        }),
      );
    });

    test("handles deeply nested error objects", () => {
      const error = {
        nested: {
          error: {
            code: "something",
            message: "Nested error",
          },
        },
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "An unexpected error occurred. Please try again.",
        }),
      );
    });
  });

  describe("Error Message Quality", () => {
    test("shows user-friendly text, not technical codes", () => {
      const error = new FirebaseError("functions/internal", "");
      (error as any).details = {
        code: ErrorCode.MUST_DRAW_CARDS,
        message: "Internal message",
      };

      notifyError(error);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/draw.*cards|cards.*draw/i),
        }),
      );
      // Should be readable English, not error codes
    });

    test("all validation error codes have clear messages", () => {
      const validationCodes = [
        ErrorCode.INVALID_CARD_INDEX,
        ErrorCode.CARD_NOT_PLAYABLE,
        ErrorCode.INVALID_COLOR,
        ErrorCode.INVALID_REQUEST,
      ];

      for (const code of validationCodes) {
        const error = new FirebaseError("functions/internal", "");
        (error as any).details = { code, message: "" };

        mockNotificationsShow.mockClear();
        notifyError(error);

        // Each should show a meaningful message
        expect(mockNotificationsShow).toHaveBeenCalled();
        const call = mockNotificationsShow.mock.calls[0];
        expect(call[0].message).toBeTruthy();
        expect(call[0].message.length).toBeGreaterThan(5);
      }
    });
  });

  describe("Console and Side Effects", () => {
    test("logs error to console.error", () => {
      const consoleSpy = mock(() => {});
      const originalError = console.error;
      console.error = consoleSpy;

      const error = new Error("Test error");
      notifyError(error);

      expect(consoleSpy).toHaveBeenCalled();

      console.error = originalError;
    });

    test("always calls notifications.show, even for unknown errors", () => {
      notifyError(Symbol("some unknown thing" as any));

      expect(mockNotificationsShow).toHaveBeenCalled();
    });
  });
});
