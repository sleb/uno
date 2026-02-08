/**
 * Uno Game Error Handling System
 *
 * This module defines the error hierarchy for the Uno game, providing:
 * - Domain-specific error classes for different error categories
 * - Error codes for type-safe event handling
 * - Shared error schemas for communication between backend and frontend
 *
 * Error flow:
 * 1. Service/Rule throws domain-specific error (ValidationError, GameStateError, etc.)
 * 2. Cloud Function catches error and converts to ErrorResponse
 * 3. Cloud Function throws HttpsError with serialized ErrorResponse in details
 * 4. Frontend retrieves typed ErrorResponse from HttpsError.details
 * 5. Frontend maps ErrorResponse to user-facing message using error code (not message string)
 */

import { z } from "zod";

/**
 * Error codes provide the contract between backend and frontend.
 * These are used to determine error type, not the error message.
 */
export enum ErrorCode {
  // Validation Errors (4xx)
  INVALID_CARD_INDEX = "INVALID_CARD_INDEX",
  INVALID_REQUEST = "INVALID_REQUEST",
  CARD_NOT_PLAYABLE = "CARD_NOT_PLAYABLE",
  WILD_COLOR_REQUIRED = "WILD_COLOR_REQUIRED",
  INVALID_DRAW_COUNT = "INVALID_DRAW_COUNT",
  MUST_DRAW_CARDS = "MUST_DRAW_CARDS",
  NOT_ENOUGH_CARDS = "NOT_ENOUGH_CARDS",
  HAND_NOT_EMPTY = "HAND_NOT_EMPTY",
  INVALID_COLOR = "INVALID_COLOR",

  // Game State Errors (5xx)
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  GAME_NOT_IN_PROGRESS = "GAME_NOT_IN_PROGRESS",
  GAME_ALREADY_STARTED = "GAME_ALREADY_STARTED",
  GAME_NOT_CREATED = "GAME_NOT_CREATED",
  NOT_YOUR_TURN = "NOT_YOUR_TURN",
  NOT_IN_GAME = "NOT_IN_GAME",
  MAX_PLAYERS_REACHED = "MAX_PLAYERS_REACHED",
  MIN_PLAYERS_NOT_MET = "MIN_PLAYERS_NOT_MET",

  // Rule Violation (conflict)
  RULE_CONFLICT = "RULE_CONFLICT",
  ILLEGAL_STACKING = "ILLEGAL_STACKING",

  // Auth/Permission Errors
  UNAUTHENTICATED = "UNAUTHENTICATED",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Internal Errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DECK_EXHAUSTED = "DECK_EXHAUSTED",
}

/**
 * Maps error codes to Firebase HttpsError codes
 * Used by Cloud Functions to determine the appropriate HTTP status code
 */
export const errorCodeToHttpsErrorCode: Record<ErrorCode, string> = {
  // 400 Bad Request
  [ErrorCode.INVALID_CARD_INDEX]: "invalid-argument",
  [ErrorCode.INVALID_REQUEST]: "invalid-argument",
  [ErrorCode.CARD_NOT_PLAYABLE]: "invalid-argument",
  [ErrorCode.WILD_COLOR_REQUIRED]: "invalid-argument",
  [ErrorCode.INVALID_DRAW_COUNT]: "invalid-argument",
  [ErrorCode.INVALID_COLOR]: "invalid-argument",

  // 400 Failed Precondition
  [ErrorCode.MUST_DRAW_CARDS]: "failed-precondition",
  [ErrorCode.NOT_YOUR_TURN]: "failed-precondition",
  [ErrorCode.GAME_NOT_IN_PROGRESS]: "failed-precondition",
  [ErrorCode.GAME_ALREADY_STARTED]: "failed-precondition",
  [ErrorCode.HAND_NOT_EMPTY]: "failed-precondition",
  [ErrorCode.ILLEGAL_STACKING]: "failed-precondition",

  // 404 Not Found
  [ErrorCode.GAME_NOT_FOUND]: "not-found",
  [ErrorCode.PLAYER_NOT_FOUND]: "not-found",
  [ErrorCode.USER_NOT_FOUND]: "not-found",

  // 404 Other
  [ErrorCode.GAME_NOT_CREATED]: "not-found",
  [ErrorCode.NOT_IN_GAME]: "not-found",

  // 409 Resource Exhausted
  [ErrorCode.NOT_ENOUGH_CARDS]: "resource-exhausted",
  [ErrorCode.DECK_EXHAUSTED]: "resource-exhausted",
  [ErrorCode.MAX_PLAYERS_REACHED]: "resource-exhausted",

  // 412 Failed Precondition
  [ErrorCode.MIN_PLAYERS_NOT_MET]: "failed-precondition",

  // 401 Unauthenticated
  [ErrorCode.UNAUTHENTICATED]: "unauthenticated",
  [ErrorCode.PERMISSION_DENIED]: "permission-denied",

  // 500 Internal Server Error
  [ErrorCode.INTERNAL_ERROR]: "internal",
  [ErrorCode.RULE_CONFLICT]: "internal",
};

/**
 * Serializable error response sent from Cloud Functions to frontend.
 * This is the contract between backend and frontend for error handling.
 */
export const ErrorResponseSchema = z.object({
  code: z.enum(Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]]),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Base class for all Uno game errors
 * Extends Error to maintain stack traces and throw-ability
 */
export class UnoError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UnoError";
    Object.setPrototypeOf(this, UnoError.prototype);
  }

  toErrorResponse(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  /**
   * Converts error to JSON for logging/serialization
   */
  toJSON(): ErrorResponse {
    return this.toErrorResponse();
  }
}

/**
 * Validation errors - thrown by input validation, card legality checks, etc.
 * Usually result in a 400 Bad Request or 412 Failed Precondition
 */
export class ValidationError extends UnoError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Game state errors - thrown when game/player/user records are missing or in wrong state
 * Usually result in a 404 Not Found or 412 Failed Precondition
 */
export class GameStateError extends UnoError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "GameStateError";
    Object.setPrototypeOf(this, GameStateError.prototype);
  }
}

/**
 * Rule violation errors - thrown when game rules are violated (e.g., illegal stacking)
 * Usually result in a 412 Failed Precondition
 */
export class RuleViolationError extends UnoError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "RuleViolationError";
    Object.setPrototypeOf(this, RuleViolationError.prototype);
  }
}

/**
 * Auth errors - thrown when user lacks permissions
 * Usually result in a 401 Unauthenticated or 403 Permission Denied
 */
export class AuthError extends UnoError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "AuthError";
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Deck/resource errors - thrown when deck is exhausted or resources depleted
 * Usually result in a 409 Resource Exhausted
 */
export class ResourceError extends UnoError {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "ResourceError";
    Object.setPrototypeOf(this, ResourceError.prototype);
  }
}

/**
 * Internal/unexpected errors - used for errors that should not occur in normal operation
 * Result in a 500 Internal Server Error
 */
export class InternalError extends UnoError {
  constructor(
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    message: string = "An unexpected error occurred",
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = "InternalError";
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Safely parse error response from HTTP error details
 */
export function parseErrorResponse(input: unknown): ErrorResponse | null {
  try {
    return ErrorResponseSchema.parse(input);
  } catch {
    return null;
  }
}

/**
 * Type guard to check if an object is an UnoError
 */
export function isUnoError(error: unknown): error is UnoError {
  return error instanceof UnoError;
}

/**
 * Type guard to check if an error is a specific category
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isGameStateError(error: unknown): error is GameStateError {
  return error instanceof GameStateError;
}

export function isRuleViolationError(
  error: unknown,
): error is RuleViolationError {
  return error instanceof RuleViolationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isResourceError(error: unknown): error is ResourceError {
  return error instanceof ResourceError;
}
/**
 * Type guard to check if error is an InternalError
 */
export function isInternalError(error: unknown): error is InternalError {
  return error instanceof InternalError;
}

/**
 * Check if an error has a specific code
 */
export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return isUnoError(error) && error.code === code;
}
