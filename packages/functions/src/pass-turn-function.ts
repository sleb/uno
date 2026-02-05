import type { CallableRequest } from "firebase-functions/https";
import { HttpsError } from "firebase-functions/https";
import { debug, error } from "firebase-functions/logger";
import { passTurn as _passTurn } from "./service/game-service";

export const passTurn = async (
  request: CallableRequest<{ gameId: string }>,
): Promise<void> => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to pass turn.",
    );
  }

  try {
    debug({ message: "Received passTurn request", data: request.data });

    if (!request.data?.gameId) {
      throw new HttpsError("invalid-argument", "gameId is required.");
    }

    const { gameId } = request.data;
    await _passTurn(gameId, request.auth.uid);
  } catch (e) {
    error({ message: "Error passing turn", error: e });

    if (e instanceof Error) {
      if (e.message.includes("not found")) {
        throw new HttpsError("not-found", "Game or player not found.");
      }
      if (e.message.includes("not in progress")) {
        throw new HttpsError("failed-precondition", "Game is not in progress.");
      }
      if (e.message.includes("Not your turn")) {
        throw new HttpsError("failed-precondition", "It is not your turn.");
      }
      if (e.message.includes("must draw cards")) {
        throw new HttpsError(
          "failed-precondition",
          "You must draw cards before passing.",
        );
      }
    }

    throw new HttpsError("internal", "An error occurred while passing turn.");
  }
};
