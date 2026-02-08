/**
 * Cloud Function Error Handling Utilities
 *
 * Converts domain errors to properly formatted HttpsError responses for frontend.
 * This is the bridge between backend error handling and Cloud Functions.
 *
 * Error flow:
 * 1. Service throws UnoError with ErrorCode
 * 2. Cloud Function catches with safeguardError()
 * 3. safeguardError converts to HttpsError with ErrorResponse in details
 * 4. Frontend catches HttpsError and extracts ErrorResponse
 * 5. Frontend maps ErrorCode to user message
 */

import type { ErrorCode, ErrorResponse } from "@uno/shared";
import {
  errorCodeToHttpsErrorCode,
  isUnoError,
  parseErrorResponse,
} from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { HttpsError } from "firebase-functions/https";
import { error as logError } from "firebase-functions/logger";

/**
 * Converts a UnoError to an HttpsError with serialized ErrorResponse in details.
 *
 * The HttpsError is thrown back to the frontend, which extracts the
 * ErrorResponse from the details property.
 *
 * @param error - UnoError to convert
 * @returns HttpsError with ErrorResponse in details
 *
 * @example
 * ```ts
 * const err = new ValidationError(
 *   ErrorCode.NOT_YOUR_TURN,
 *   "It is not your turn"
 * );
 * throw unoErrorToHttpsError(err);
 * ```
 *
 * Frontend retrieves with:
 * ```ts
 * catch (err) {
 *   const response = parseErrorResponse((err as any).details);
 *   if (response?.code === ErrorCode.NOT_YOUR_TURN) {
 *     // handle specifically
 *   }
 * }
 * ```
 */
export function unoErrorToHttpsError(
  error: Error & { code?: ErrorCode; details?: Record<string, unknown> },
): HttpsError {
  const code = error.code as ErrorCode | undefined;
  if (!code) {
    return new HttpsError("internal", error.message);
  }

  const httpsErrorCode = errorCodeToHttpsErrorCode[code];
  const response: ErrorResponse = {
    code,
    message: error.message,
    details: error.details,
  };

  return new HttpsError(httpsErrorCode, error.message, response);
}

/**
 * Safely handles any error and converts it to an appropriate HttpsError.
 *
 * Rules:
 * 1. If error is UnoError, convert using unoErrorToHttpsError
 * 2. If error is HttpsError, re-throw as-is (already formatted)
 * 3. If error is Error, log with context and wrap in generic InternalError
 * 4. If error is unknown type, log and wrap generically
 *
 * This ensures that all errors thrown from Cloud Functions are properly
 * formatted with serialized ErrorResponse in details.
 *
 * @param error - Any error thrown by service or handler
 * @returns Properly formatted HttpsError
 *
 * @example
 * ```ts
 * export const playCard = onCall(async (request) => {
 *   try {
 *     return await playCardService(request.auth.uid, request.data);
 *   } catch (e) {
 *     throw safeguardError(e);
 *   }
 * });
 * ```
 */
export function safeguardError(error: unknown): HttpsError {
  // Already an HttpsError, pass through
  if (error instanceof HttpsError) {
    return error;
  }

  // Domain-specific error, convert to HttpsError
  if (isUnoError(error)) {
    const unoErr = error as Error & {
      code?: ErrorCode;
      details?: Record<string, unknown>;
    };
    return unoErrorToHttpsError(unoErr);
  }

  // Generic Error - log with context and wrap
  if (error instanceof Error) {
    logError("Unexpected error in Cloud Function", {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });

    const response: ErrorResponse = {
      code: "INTERNAL_ERROR" as ErrorCode,
      message: "An unexpected error occurred. Please try again.",
    };

    return new HttpsError("internal", response.message, response);
  }

  // Unknown error type
  logError("Unknown error type in Cloud Function", { error });

  const response: ErrorResponse = {
    code: "INTERNAL_ERROR" as ErrorCode,
    message: "An unexpected error occurred. Please try again.",
  };

  return new HttpsError("internal", response.message, response);
}

/**
 * Asserts that an error is a UnoError with the specified code.
 *
 * Useful for precise error handling in catch blocks when you need to
 * perform specific recovery logic or re-throw conditionally.
 *
 * @param error - Error to check
 * @param code - Expected error code
 * @returns True if error matches, allowing type narrowing
 *
 * @example
 * ```ts
 * try {
 *   await playCard(gameId, userId, cardIndex);
 * } catch (e) {
 *   if (assertErrorCode(e, ErrorCode.NOT_YOUR_TURN)) {
 *     // Handle turn error specifically
 *     throw new HttpsError("failed-precondition", "It is not your turn.");
 *   }
 *   // All other errors
 *   throw safeguardError(e);
 * }
 * ```
 */
export function assertErrorCode(
  error: unknown,
  code: ErrorCode,
): error is Error & { code: ErrorCode } {
  if (!isUnoError(error)) return false;
  const unoErr = error as Error & { code?: ErrorCode };
  return unoErr.code === code;
}

/**
 * Wraps a Cloud Function handler to automatically convert all errors.
 *
 * This wrapper catches any error thrown by the handler and converts it
 * to a properly formatted HttpsError using safeguardError().
 *
 * No need to manually call safeguardError() if wrapping the handler.
 *
 * @param handler - Async handler function
 * @returns Wrapped handler with automatic error conversion
 *
 * @example
 * ```ts
 * export const playCard = onCall(withErrorHandling(async (request) => {
 *   const result = PlayCardRequestSchema.safeParse(request.data);
 *   if (!result.success) {
 *     throw new ValidationError(
 *       ErrorCode.INVALID_REQUEST,
 *       "Invalid request data",
 *       { errors: result.error.flatten() }
 *     );
 *   }
 *   return await playCardService(request.auth.uid, result.data);
 * }));
 * ```
 */
export function withErrorHandling<T>(
  handler: (request: CallableRequest<unknown>) => Promise<T>,
): (request: CallableRequest<unknown>) => Promise<T> {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      throw safeguardError(error);
    }
  };
}

/**
 * Validates that auth context exists and returns the uid
 *
 * Throws AuthError if request is not authenticated.
 * Use this at the start of Cloud Function handlers to ensure auth.
 *
 * @param request - Cloud Function request
 * @returns Authenticated user ID
 * @throws AuthError if not authenticated
 *
 * @example
 * ```ts
 * export const playCard = onCall(async (request) => {
 *   const uid = requireAuth(request);
 *   return await playCardService(uid, request.data);
 * });
 * ```
 */
export function requireAuth(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) {
    const { AuthError, ErrorCode } = require("@uno/shared");
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated",
    );
  }
  return uid;
}

export { parseErrorResponse };
