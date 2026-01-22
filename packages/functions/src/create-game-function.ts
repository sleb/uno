import { type CreateGameRequest, type CreateGameResponse } from "@uno/shared";
import { HttpsError, onCall } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { createGame as _createGame } from "./service/game-service";

export const createGame = onCall<
  CreateGameRequest,
  Promise<CreateGameResponse>
>(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to create a game.",
    );
  }

  try {
    const id = await _createGame(request.auth.uid, request.data);
    return { gameId: id };
  } catch (e) {
    error({ message: "Error creating game", error: e });
    throw new HttpsError(
      "internal",
      "An error occurred while creating the game.",
    );
  }
});
