import {
  type CallUnoRequest,
  CallUnoRequestSchema,
  type CallUnoResponse,
} from "@uno/shared";
import { HttpsError, type CallableRequest } from "firebase-functions/https";
import { error } from "firebase-functions/logger";
import { callUno as _callUno } from "./service/game-service";

export const callUno = async (
  request: CallableRequest<CallUnoRequest>,
): Promise<CallUnoResponse> => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to call UNO.",
    );
  }

  try {
    const { gameId } = CallUnoRequestSchema.parse(request.data);
    return await _callUno(gameId, request.auth.uid);
  } catch (e) {
    error({ message: "Error calling UNO", error: e });

    if (e instanceof Error) {
      if (e.message.includes("not found")) {
        throw new HttpsError("not-found", "Game or player not found.");
      }
      if (e.message.includes("not in progress")) {
        throw new HttpsError("failed-precondition", "Game is not in progress.");
      }
      if (e.message.includes("No player to catch")) {
        throw new HttpsError("failed-precondition", e.message);
      }
    }

    throw new HttpsError("internal", "An error occurred while calling UNO.");
  }
};
