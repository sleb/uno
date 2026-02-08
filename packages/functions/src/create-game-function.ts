import type { CreateGameRequest, CreateGameResponse } from "@uno/shared";
import { AuthError, ErrorCode } from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { safeguardError } from "./service/errors";
import { createGame as _createGame } from "./service/game-service";

export const createGame = async (
  request: CallableRequest<CreateGameRequest>,
): Promise<CreateGameResponse> => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to create a game.",
    );
  }

  try {
    const gameId = await _createGame(request.auth.uid, request.data);
    return { gameId };
  } catch (e) {
    throw safeguardError(e);
  }
};
