import type { CreateGameRequest, CreateGameResponse } from "@uno/shared";
import { type CallableRequest, HttpsError } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { createGame as _createGame } from "./service/game-service";

export const createGame = async (
  request: CallableRequest<CreateGameRequest>,
): Promise<CreateGameResponse> => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to create a game.",
    );
  }

  try {
    const gameId = await _createGame(request.auth.uid, request.data);
    return { gameId };
  } catch (e) {
    error({ message: "Error creating game", error: e });
    throw new HttpsError(
      "internal",
      "An error occurred while creating the game.",
    );
  }
};
