import {
  AuthError,
  type DrawCardRequest,
  DrawCardRequestSchema,
  type DrawCardResponse,
  ErrorCode,
} from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { safeguardError } from "./service/errors";
import { drawCard as _drawCard } from "./service/game-service";

export const drawCard = async (
  request: CallableRequest<DrawCardRequest>,
): Promise<DrawCardResponse> => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to draw a card.",
    );
  }

  try {
    const { gameId, count } = DrawCardRequestSchema.parse(request.data);
    return await _drawCard(gameId, request.auth.uid, count);
  } catch (e) {
    throw safeguardError(e);
  }
};
