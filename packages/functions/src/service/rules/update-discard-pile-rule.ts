import { GAME_STATUSES } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

/**
 * Update Discard Pile Rule
 *
 * Phase: apply
 * Purpose: Update game's discard pile with played card and set game status
 */
export const createUpdateDiscardPileRule = (): Rule => ({
  name: "update-discard-pile",
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
    const { game, playerHand } = ctx;

    const playedCard = playerHand.hand[cardIndex];
    if (!playedCard) {
      throw new Error("Invalid card index");
    }

    const updatedDiscardPile = [...game.state.discardPile, playedCard];
    const newHandSize = playerHand.hand.length - 1;
    const isWinner = newHandSize === 0;

    return {
      effects: [
        {
          type: "update-game",
          updates: {
            "state.discardPile": updatedDiscardPile,
            "state.status": isWinner
              ? GAME_STATUSES.COMPLETED
              : GAME_STATUSES.IN_PROGRESS,
            lastActivityAt: ctx.now,
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
