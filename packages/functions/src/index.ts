import { onCall } from "firebase-functions/https";
import { createGame as createGameFunc } from "./create-game-function";
import { joinGame as joinGameFunc } from "./join-game-function";

export const createGame = onCall({ cors: true }, createGameFunc);
export const joinGame = onCall({ cors: true }, joinGameFunc);
