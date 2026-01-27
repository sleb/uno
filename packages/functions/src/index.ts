import { onCall } from "firebase-functions/https";
import { createGame as createGameFunc } from "./create-game-function";
import { joinGame as joinGameFunc } from "./join-game-function";
import { startGame as startGameFunc } from "./start-game-function";

export const createGame = onCall({ cors: true }, createGameFunc);
export const joinGame = onCall({ cors: true }, joinGameFunc);
export const startGame = onCall({ cors: true }, startGameFunc);
