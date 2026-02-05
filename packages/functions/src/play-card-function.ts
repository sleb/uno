import { type PlayCardRequest, PlayCardRequestSchema } from "@uno/shared";
import { type CallableRequest, HttpsError } from "firebase-functions/https";
import { debug, error } from "firebase-functions/logger";
import z from "zod";
import { playCard as _playCard } from "./service/game-service";

export const playCard = async (
  request: CallableRequest<PlayCardRequest>,
): Promise<{ winner?: string }> => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to play a card.",
    );
  }

  try {
    const result = PlayCardRequestSchema.safeParse(request.data);
    if (!result.success) {
      error({
        message: "Invalid PlayCardRequest",
        errors: z.formatError(result.error),
      });
      throw new HttpsError("invalid-argument", "Invalid request data.");
    }
    const { gameId, cardIndex, chosenColor } = PlayCardRequestSchema.parse(
      request.data,
    );
    return await _playCard(gameId, request.auth.uid, cardIndex, chosenColor);
  } catch (e) {
    error({ message: "Error playing card", error: e });

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
      if (
        e.message.includes("Card cannot be played") ||
        e.message.includes("Invalid card index") ||
        e.message.includes("Wild card requires chosen color") ||
        e.message.includes("Wild Draw Four")
      ) {
        throw new HttpsError("invalid-argument", e.message);
      }
    }

    throw new HttpsError("internal", "An error occurred while playing a card.");
  }
};
