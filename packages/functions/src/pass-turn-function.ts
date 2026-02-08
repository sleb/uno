import { AuthError, ErrorCode, ValidationError } from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { debug } from "firebase-functions/logger";
import { safeguardError } from "./service/errors";
import { passTurn as _passTurn } from "./service/game-service";

export const passTurn = async (
  request: CallableRequest<{ gameId: string }>,
): Promise<void> => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to pass turn.",
    );
  }

  try {
    debug({ message: "Received passTurn request", data: request.data });

    if (!request.data?.gameId) {
      throw new ValidationError(
        ErrorCode.INVALID_REQUEST,
        "gameId is required.",
      );
    }

    const { gameId } = request.data;
    await _passTurn(gameId, request.auth.uid);
  } catch (e) {
    throw safeguardError(e);
  }
};
