import type { Rule, RuleContext, RuleResult } from "./types";

/**
 * Update Player Hand Rule
 *
 * Phase: apply
 * Purpose: Remove played card from player's hand and update cardCount
 */
export const createUpdatePlayerHandRule = (): Rule => ({
  name: "update-player-hand",
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
    const { playerId, playerHand } = ctx;

    const newHand = playerHand.hand.filter((_, index) => index !== cardIndex);
    const isWinner = newHand.length === 0;

    return {
      effects: [
        {
          type: "update-hand",
          playerId,
          hand: newHand,
        },
        {
          type: "update-player",
          playerId,
          updates: {
            cardCount: newHand.length,
            status: isWinner ? "winner" : "active",
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
