import { AuthError, ErrorCode } from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { safeguardError } from "./service/errors";
import { addPlayerToGame } from "./service/game-service";

interface JoinGameRequest {
  gameId: string;
}

export const joinGame = async (request: CallableRequest<JoinGameRequest>) => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to join a game.",
    );
  }

  try {
    const { gameId } = request.data;
    await addPlayerToGame(gameId, request.auth.uid);
  } catch (e) {
    throw safeguardError(e);
  }
};
