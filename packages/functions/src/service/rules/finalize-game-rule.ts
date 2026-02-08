import type { UserData } from "@uno/shared";
import { type GamePlayerData, UserDataSchema } from "@uno/shared";
import {
  getDoc,
  getGamePlayer,
  getPlayerHands,
  userRef,
} from "../game-service";
import type { Rule, RuleContext, RuleResult } from "./types";

/**
 * Finalize Game Rule
 *
 * Phase: finalize
 * Purpose: Pre-fetch data needed for game finalization when player wins
 */
export const createFinalizeGameRule = (): Rule => ({
  name: "finalize-game",
  phase: "finalize",

  canHandle: (ctx: RuleContext): boolean => {
    if (ctx.action.type !== "play") {
      return false;
    }

    const { playerHand } = ctx;
    const newHandSize = playerHand.hand.length - 1;
    return newHandSize === 0;
  },

  validate: (): void => {
    // No validation needed - this is a finalize-phase rule
  },

  apply: (_ctx: RuleContext): RuleResult => {
    // This is async work that happens in finalize phase
    // It will be handled separately in the pipeline executor
    return { effects: [], cardsDrawn: [] };
  },

  // Special async method for finalize phase
  async finalize(ctx: RuleContext): Promise<RuleResult> {
    if (ctx.action.type !== "play") {
      return { effects: [], cardsDrawn: [] };
    }

    const { gameId, playerId, game, playerHand, transaction: t } = ctx;
    const { cardIndex } = ctx.action;

    const newHand = playerHand.hand.filter((_, index) => index !== cardIndex);

    if (newHand.length !== 0) {
      return { effects: [], cardsDrawn: [] };
    }

    // Pre-fetch all data needed for finalizeGame
    const playerIds = game.players;
    const playerHands = await getPlayerHands(gameId, playerIds, t);
    const gamePlayers: Record<string, GamePlayerData> = {};
    const userDataMap: Record<string, UserData> = {};

    for (const playerId of playerIds) {
      gamePlayers[playerId] = await getGamePlayer(gameId, playerId, t);
    }

    for (const playerId of playerIds) {
      const userSnap = await getDoc(userRef(playerId), t);
      if (userSnap.exists) {
        userDataMap[playerId] = UserDataSchema.parse(userSnap.data());
      }
    }

    // Update the current player's hand in the pre-fetched data
    playerHands[playerId] = { hand: newHand };

    return {
      effects: [
        {
          type: "set-winner",
          winnerId: playerId,
          preFetchedData: {
            game,
            playerHands,
            gamePlayers,
            userDataMap,
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
