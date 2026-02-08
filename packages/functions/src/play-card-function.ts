import {
  type PlayCardRequest,
  PlayCardRequestSchema,
} from "@uno/shared";
import { type CallableRequest } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import z from "zod";
import { safeguardError, requireAuth } from "./service/errors";
import { playCard as _playCard } from "./service/game-service";

export const playCard = async (
  request: CallableRequest<PlayCardRequest>,
): Promise<{ winner?: string }> => {
  const uid = requireAuth(request);

  try {
    const result = PlayCardRequestSchema.safeParse(request.data);
    if (!result.success) {
      error({
        message: "Invalid PlayCardRequest",
        errors: z.formatError(result.error),
      });
      throw new Error("Invalid request data.");
    }
    const { gameId, cardIndex, chosenColor } = PlayCardRequestSchema.parse(
      request.data,
    );
    return await _playCard(gameId, uid, cardIndex, chosenColor);
  } catch (e) {
    throw safeguardError(e);
  }
};
