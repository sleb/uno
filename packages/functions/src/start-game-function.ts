import { StartGameRequestSchema, type StartGameRequest } from "@uno/shared";
import { HttpsError, type CallableRequest } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { startGame as _startGame } from "./service/game-service";

export const startGame = async (request: CallableRequest<StartGameRequest>) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to start a game.",
    );
  }

  try {
    const { gameId } = StartGameRequestSchema.parse(request.data);
    await _startGame(gameId);
  } catch (e) {
    error({ message: "Error starting game", error: e });

    if (e instanceof Error) {
      if (e.message.includes("not found")) {
        throw new HttpsError("not-found", "Game not found.");
      }
      if (e.message.includes("not in waiting status")) {
        throw new HttpsError("failed-precondition", "Game has already started.");
      }
      if (e.message.includes("at least 2 players")) {
        throw new HttpsError(
          "failed-precondition",
          "Game must have at least 2 players to start.",
        );
      }
      if (e.message.includes("Not enough cards")) {
        throw new HttpsError(
          "resource-exhausted",
          "Not enough cards in deck to start the game.",
        );
      }
    }

    throw new HttpsError(
      "internal",
      "An error occurred while starting the game.",
    );
  }
};
