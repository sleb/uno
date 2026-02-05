import { onCall } from "firebase-functions/https";
import { callUno as callUnoFunc } from "./call-uno-function";
import { createGame as createGameFunc } from "./create-game-function";
import { drawCard as drawCardFunc } from "./draw-card-function";
import { joinGame as joinGameFunc } from "./join-game-function";
import { passTurn as passTurnFunc } from "./pass-turn-function";
import { playCard as playCardFunc } from "./play-card-function";
import { startGame as startGameFunc } from "./start-game-function";

export const createGame = onCall({ cors: true }, createGameFunc);
export const joinGame = onCall({ cors: true }, joinGameFunc);
export const startGame = onCall({ cors: true }, startGameFunc);
export const playCard = onCall({ cors: true }, playCardFunc);
export const drawCard = onCall({ cors: true }, drawCardFunc);
export const passTurn = onCall({ cors: true }, passTurnFunc);
export const callUno = onCall({ cors: true }, callUnoFunc);
