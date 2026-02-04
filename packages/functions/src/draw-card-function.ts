import {
  type DrawCardRequest,
  DrawCardRequestSchema,
  type DrawCardResponse,
} from "@uno/shared";
import { type CallableRequest, HttpsError } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { drawCard as _drawCard } from "./service/game-service";

export const drawCard = async (
  request: CallableRequest<DrawCardRequest>,
): Promise<DrawCardResponse> => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to draw a card.",
    );
  }

  try {
    const { gameId, count } = DrawCardRequestSchema.parse(request.data);
    return await _drawCard(gameId, request.auth.uid, count);
  } catch (e) {
    error({ message: "Error drawing card", error: e });

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
      if (e.message.includes("Not enough cards in deck")) {
        throw new HttpsError(
          "resource-exhausted",
          "Not enough cards left in the deck.",
        );
      }
    }

    throw new HttpsError("internal", "An error occurred while drawing a card.");
  }
};
