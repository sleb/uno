import {
  AuthError,
  ErrorCode,
  type StartGameRequest,
  StartGameRequestSchema,
} from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { safeguardError } from "./service/errors";
import { startGame as _startGame } from "./service/game-service";

export const startGame = async (request: CallableRequest<StartGameRequest>) => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to start a game.",
    );
  }

  try {
    const { gameId } = StartGameRequestSchema.parse(request.data);
    await _startGame(gameId);
  } catch (e) {
    throw safeguardError(e);
  }
};
