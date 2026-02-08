import { ErrorCode, ValidationError } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

/**
 * Update Player Stats Rule
 *
 * Phase: apply
 * Purpose: Update player game stats (cardsPlayed, turnsPlayed, specialCardsPlayed) and UNO flags
 */
export const createUpdatePlayerStatsRule = (): Rule => ({
  name: "update-player-stats",
  phase: "apply",

  canHandle: (ctx: RuleContext): boolean => {
    return ctx.action.type === "play";
  },

  validate: (): void => {
    // No validation needed - this is an apply-phase rule
  },

  apply: (ctx: RuleContext): RuleResult => {
    if (ctx.action.type !== "play") {
      return { effects: [], cardsDrawn: [] };
    }

    const { cardIndex } = ctx.action;
    const { playerId, player, playerHand, now } = ctx;

    const playedCard = playerHand.hand[cardIndex];
    if (!playedCard) {
      throw new ValidationError(
        ErrorCode.INVALID_ACTION,
        "Invalid card index",
        { cardIndex },
      );
    }

    const newHandSize = playerHand.hand.length - 1;

    return {
      effects: [
        {
          type: "update-player",
          playerId,
          updates: {
            "gameStats.cardsPlayed": player.gameStats.cardsPlayed + 1,
            "gameStats.turnsPlayed": player.gameStats.turnsPlayed + 1,
            "gameStats.specialCardsPlayed":
              player.gameStats.specialCardsPlayed +
              (playedCard.kind === "number" ? 0 : 1),
            hasCalledUno: false,
            mustCallUno: newHandSize === 1,
            lastActionAt: now,
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
