import {
  AuthError,
  type CallUnoRequest,
  CallUnoRequestSchema,
  type CallUnoResponse,
  ErrorCode,
} from "@uno/shared";
import type { CallableRequest } from "firebase-functions/https";
import { safeguardError } from "./service/errors";
import { callUno as _callUno } from "./service/game-service";

export const callUno = async (
  request: CallableRequest<CallUnoRequest>,
): Promise<CallUnoResponse> => {
  if (!request.auth) {
    throw new AuthError(
      ErrorCode.UNAUTHENTICATED,
      "User must be authenticated to call UNO.",
    );
  }

  try {
    const { gameId } = CallUnoRequestSchema.parse(request.data);
    return await _callUno(gameId, uid);
  } catch (e) {
    throw safeguardError(e);
  }
};
