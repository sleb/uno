import { HttpsError, onCall } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { addPlayerToGame } from "./service/game-service";

interface JoinGameRequest {
  gameId: string;
}

export const joinGame = onCall<JoinGameRequest, Promise<void>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to join a game.",
      );
    }

    try {
      const { gameId } = request.data;
      await addPlayerToGame(gameId, request.auth.uid);
    } catch (e) {
      error({ message: "Error joining game", error: e });

      if (e instanceof Error) {
        if (e.message.includes("not found")) {
          throw new HttpsError("not-found", "Game not found.");
        }
        if (e.message.includes("is full")) {
          throw new HttpsError("failed-precondition", "Game is full.");
        }
        if (e.message.includes("already started")) {
          throw new HttpsError(
            "failed-precondition",
            "Game has already started.",
          );
        }
      }

      throw new HttpsError(
        "internal",
        "An error occurred while joining the game.",
      );
    }
  },
);
