import { Notifications, notifications } from "@mantine/notifications";
import { parseErrorResponse } from "@uno/shared";
import { FirebaseError } from "firebase/app";
import {
  ERROR_MESSAGES,
  FIREBASE_AUTH_ERROR_MAP,
} from "../hooks/useErrorHandler";

/**
 * ERROR_MESSAGES and FIREBASE_AUTH_ERROR_MAP are imported from useErrorHandler
 * to maintain a single source of truth for error message mappings.
 * This ensures consistency between the hook and notification system.
 */

type NotificationType = "info" | "success" | "error";

export interface NotificationPayload {
  title?: string;
  message: string;
  autoClose?: number | boolean;
  id?: string;
}

/**
 * Mount this once near the root (e.g., in `frontend.tsx`) to enable notifications.
 */
export const UnoNotificationsHost = () => (
  <Notifications position="top-right" limit={4} zIndex={2200} />
);

const typeDefaults: Record<NotificationType, { color: string; title: string }> =
  {
    info: { color: "unoBlue", title: "Notice" },
    success: { color: "unoGreen", title: "Success" },
    error: { color: "red", title: "Something went wrong" },
  };

/**
 * Show a typed, themed notification.
 */
const notify = (type: NotificationType, payload: NotificationPayload) => {
  const defaults = typeDefaults[type];
  notifications.show({
    color: defaults.color,
    title: payload.title ?? defaults.title,
    message: payload.message,
    autoClose: payload.autoClose ?? 4000,
    id: payload.id,
  });
};

export const notifyInfo = (payload: NotificationPayload) =>
  notify("info", payload);

export const notifySuccess = (payload: NotificationPayload) =>
  notify("success", payload);

/**
 * Display an error notification with intelligent error mapping.
 *
 * Maps error codes to user-friendly messages following a smart fallback chain:
 *
 * Error Resolution Pipeline:
 * 1. **ErrorCode Mapping** - Extracts ErrorCode from Cloud Function HttpsError.details
 *    and maps to ERROR_MESSAGES (most specific, user-friendly)
 * 2. **Firebase Auth Errors** - Maps auth-specific fire codes (auth/network-request-failed, etc.)
 *    to FIREBASE_AUTH_ERROR_MAP for auth context
 * 3. **Error.message Fallback** - Uses native Error message if code isn't recognized
 * 4. **Generic Fallback** - Shows standard "unexpected error" message as last resort
 *
 * This function connects the frontend error handling to the Cloud Function error
 * architecture, ensuring errors thrown by validations, game actions, and Firebase
 * operations all show appropriate user-facing messages.
 *
 * **Architecture Integration:**
 * - Backend throws `UnoError` with specific `ErrorCode`
 * - Cloud Function converts to `HttpsError` with ErrorResponse in `details`
 * - Frontend `notifyError()` extracts ErrorCode and maps via `ERROR_MESSAGES`
 * - Result: Consistent, type-safe error messages across the app
 *
 * @param err - Any error thrown from async operations
 *   - Cloud Function HttpsError (with ErrorResponse in details)
 *   - Firebase Auth errors
 *   - Native JavaScript Error objects
 *   - Unknown/unexpected errors
 *
 * @example
 * ```tsx
 * const handlePlayCard = async (cardIndex: number) => {
 *   try {
 *     await playCard({ gameId, cardIndex });
 *   } catch (error) {
 *     // Automatically shows: "This card cannot be played right now. Choose a different card."
 *     // for ErrorCode.CARD_NOT_PLAYABLE, or appropriate fallback message
 *     notifyError(error);
 *   }
 * };
 * ```
 *
 * @see {@link useErrorHandler} - Hook version with additional utilities (hasErrorCode, isClientError)
 * @see {@link ERROR_MESSAGES} - All supported error codes and messages
 * @see {@link FIREBASE_AUTH_ERROR_MAP} - Firebase auth error mappings
 */
export const notifyError = (err: unknown) => {
  console.error("Error encountered:", err);

  let message: string | undefined;

  // Try ErrorCode mapping from Cloud Functions
  if (err instanceof FirebaseError) {
    const httpError = err as FirebaseError & { details?: unknown };
    const errorResponse = parseErrorResponse(httpError.details);
    if (errorResponse?.code && errorResponse.code in ERROR_MESSAGES) {
      message = ERROR_MESSAGES[errorResponse.code];
    } else if (errorResponse?.message) {
      message = errorResponse.message;
    }
  }

  // Fall back to Firebase auth error codes (only if no message yet)
  if (!message && err instanceof FirebaseError) {
    const firebaseMessage =
      FIREBASE_AUTH_ERROR_MAP[(err as FirebaseError).code];
    if (firebaseMessage) {
      message = firebaseMessage;
    } else if (
      (err as FirebaseError).message &&
      (err as FirebaseError).message.length > (err as FirebaseError).code.length
    ) {
      message = (err as FirebaseError).message;
    }
  }

  // Fall back to generic Error message
  if (!message && err instanceof Error && err.message) {
    message = err.message;
  }

  // Last resort: generic error message
  if (!message) {
    message = "An unexpected error occurred. Please try again.";
  }

  notify("error", { message });
};
