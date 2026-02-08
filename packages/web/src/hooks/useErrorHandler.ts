/**
 * Frontend Error Handler Hook
 *
 * Provides type-safe error handling without string matching.
 * Maps error codes to user-facing messages via a stable callback reference.
 *
 * This hook:
 * - Extracts and validates error responses from Cloud Functions
 * - Maps ErrorCode constants to user messages (no string matching)
 * - Handles Firebase auth errors
 * - Provides utilities for error-specific UI behavior
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { handleError, getErrorMessage } = useErrorHandler();
 *
 *   const onPlayCard = async () => {
 *     try {
 *       await playCard(gameId, cardIndex);
 *     } catch (error) {
 *       handleError(error);
 *     }
 *   };
 * }
 * ```
 */

import {
  ErrorCode,
  type ErrorResponse,
  isUnoError,
  parseErrorResponse,
} from "@uno/shared";
import { FirebaseError } from "firebase/app";
import { useCallback } from "react";
import { notifyError } from "../components/notifications";

/**
 * User-facing error messages mapped by ErrorCode.
 * These messages are displayed to the user in notifications.
 * All keys must match ErrorCode enum values.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Validation Errors
  [ErrorCode.INVALID_CARD_INDEX]:
    "The selected card is not in your hand. Please try again.",
  [ErrorCode.INVALID_REQUEST]:
    "Your request was invalid. Please check your input and try again.",
  [ErrorCode.CARD_NOT_PLAYABLE]:
    "This card cannot be played right now. Choose a different card.",
  [ErrorCode.WILD_COLOR_REQUIRED]:
    "You must choose a color when playing a wild card.",
  [ErrorCode.INVALID_DRAW_COUNT]:
    "Invalid number of cards to draw. Please try again.",
  [ErrorCode.MUST_DRAW_CARDS]:
    "You must draw cards first. You cannot do this action yet.",
  [ErrorCode.NOT_ENOUGH_CARDS]: "Not enough cards available. Please try again.",
  [ErrorCode.HAND_NOT_EMPTY]:
    "You still have cards in your hand. You cannot end the game yet.",
  [ErrorCode.INVALID_COLOR]: "Invalid color. Please choose a valid color.",

  // Game State Errors
  [ErrorCode.GAME_NOT_FOUND]:
    "The game could not be found. It may have been deleted.",
  [ErrorCode.PLAYER_NOT_FOUND]:
    "You are not in this game. You may have been removed.",
  [ErrorCode.USER_NOT_FOUND]:
    "Your user account could not be found. Please log in again.",
  [ErrorCode.GAME_NOT_IN_PROGRESS]:
    "This game is not in progress. It may have ended.",
  [ErrorCode.GAME_ALREADY_STARTED]:
    "This game has already started. You cannot join it now.",
  [ErrorCode.GAME_NOT_CREATED]:
    "The game could not be created. Please try again.",
  [ErrorCode.NOT_YOUR_TURN]: "It is not your turn. Please wait for your turn.",
  [ErrorCode.NOT_IN_GAME]:
    "You are not in this game. Join the game to participate.",
  [ErrorCode.MAX_PLAYERS_REACHED]:
    "This game is full. Choose a different game or create a new one.",
  [ErrorCode.MIN_PLAYERS_NOT_MET]:
    "Not enough players in the game. At least 2 players are required.",

  // Rule Violation
  [ErrorCode.RULE_CONFLICT]:
    "A conflicting game rule was triggered. Please try a different action.",
  [ErrorCode.ILLEGAL_STACKING]:
    "You cannot stack from this card. Choose a different action.",

  // Auth Errors
  [ErrorCode.UNAUTHENTICATED]:
    "You are not logged in. Please log in to continue.",
  [ErrorCode.PERMISSION_DENIED]:
    "You do not have permission to perform this action.",

  // Resource Errors
  [ErrorCode.DECK_EXHAUSTED]: "The deck is exhausted. Game cannot continue.",

  // Internal Errors
  [ErrorCode.INTERNAL_ERROR]: "An unexpected error occurred. Please try again.",
};

/**
 * Maps Firebase auth error codes to user-friendly messages
 */
export const FIREBASE_AUTH_ERROR_MAP: Record<string, string> = {
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Invalid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/email-already-in-use": "This email is already registered.",
  "auth/operation-not-allowed": "This operation is not allowed.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
};

/**
 * Hook return type for error handling
 */
interface UseErrorHandlerReturn {
  /**
   * Handle any error with automatic notification
   */
  handleError: (error: unknown) => void;

  /**
   * Get the user-facing message for any error
   */
  getErrorMessage: (error: unknown) => string;

  /**
   * Extract typed error response from HttpsError
   */
  extractErrorResponse: (error: unknown) => ErrorResponse | null;

  /**
   * Check if error has a specific error code
   */
  hasErrorCode: (error: unknown, code: ErrorCode) => boolean;

  /**
   * Check if error code indicates a client/validation error vs server error
   */
  isClientError: (code: ErrorCode) => boolean;

  /**
   * Check if error code indicates a server/internal error
   */
  isServerError: (code: ErrorCode) => boolean;
}

/**
 * Custom hook for unified error handling in React components
 *
 * Provides typed error utilities without string matching.
 * Automatically notifies user of errors via toast notifications.
 *
 * @returns Object with error handling utilities
 *
 * @example
 * ```tsx
 * function GameControls() {
 *   const { handleError, hasErrorCode } = useErrorHandler();
 *
 *   const playCard = async (index: number) => {
 *     try {
 *       await playCardFunction({ cardIndex: index });
 *     } catch (error) {
 *       if (hasErrorCode(error, ErrorCode.NOT_YOUR_TURN)) {
 *         console.log("Waiting for turn...");
 *       } else {
 *         handleError(error);
 *       }
 *     }
 *   };
 * }
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  /**
   * Extract typed error response from HttpsError details
   */
  const extractErrorResponse = useCallback(
    (error: unknown): ErrorResponse | null => {
      // HttpsError from Cloud Functions
      if (error instanceof FirebaseError) {
        const httpError = error as FirebaseError & { details?: unknown };
        const parsed = parseErrorResponse(httpError.details);
        if (parsed) {
          return parsed;
        }
      }

      // Native UnoError (shouldn't happen on frontend)
      if (isUnoError(error)) {
        const unoErr = error as Error & {
          toErrorResponse?: () => ErrorResponse;
        };
        return unoErr.toErrorResponse?.() || null;
      }

      return null;
    },
    [],
  );

  /**
   * Get user-facing message for any error
   */
  const getErrorMessage = useCallback(
    (error: unknown): string => {
      // Try to extract Uno error response first
      const errorResponse = extractErrorResponse(error);
      if (errorResponse) {
        return ERROR_MESSAGES[errorResponse.code] || errorResponse.message;
      }

      // Handle Firebase Auth errors
      if (error instanceof FirebaseError) {
        return FIREBASE_AUTH_ERROR_MAP[error.code] || error.message;
      }

      // Handle native Error objects
      if (error instanceof Error && error.message.length > 0) {
        return error.message;
      }

      // Fallback to generic error message
      return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
    },
    [extractErrorResponse],
  );

  /**
   * Check if error has a specific error code
   */
  const hasErrorCode = useCallback(
    (error: unknown, code: ErrorCode): boolean => {
      const response = extractErrorResponse(error);
      return response?.code === code;
    },
    [extractErrorResponse],
  );

  /**
   * Check if error code represents a client/validation error
   */
  const isClientError = useCallback((code: ErrorCode): boolean => {
    return [
      ErrorCode.INVALID_CARD_INDEX,
      ErrorCode.INVALID_REQUEST,
      ErrorCode.CARD_NOT_PLAYABLE,
      ErrorCode.WILD_COLOR_REQUIRED,
      ErrorCode.INVALID_DRAW_COUNT,
      ErrorCode.INVALID_COLOR,
      ErrorCode.MUST_DRAW_CARDS,
      ErrorCode.NOT_YOUR_TURN,
      ErrorCode.HAND_NOT_EMPTY,
    ].includes(code);
  }, []);

  /**
   * Check if error code represents a server/internal error
   */
  const isServerError = useCallback((code: ErrorCode): boolean => {
    return [
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.DECK_EXHAUSTED,
      ErrorCode.RULE_CONFLICT,
    ].includes(code);
  }, []);

  /**
   * Handle any error and show notification to user
   *
   * Detects error type and shows appropriate toast message.
   * Does NOT throw - errors are consumed and notified.
   */
  const handleError = useCallback(
    (error: unknown): void => {
      const message = getErrorMessage(error);
      notifyError({ message });
    },
    [getErrorMessage],
  );

  return {
    handleError,
    getErrorMessage,
    extractErrorResponse,
    hasErrorCode,
    isClientError,
    isServerError,
  };
}
