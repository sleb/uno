import { applyCardEffect, getNextPlayerId } from "../card-validation";
import type { Rule, RuleContext, RuleResult } from "./types";

/**
 * Apply Card Effect Rule
 *
 * Phase: apply
 * Purpose: Calculate card effects (direction change, mustDraw, skipNext) and determine next player
 */
export const createApplyCardEffectRule = (): Rule => ({
  name: "apply-card-effect",
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

    const { cardIndex, chosenColor } = ctx.action;
    const { game, playerId, playerHand } = ctx;

    const playedCard = playerHand.hand[cardIndex];
    if (!playedCard) {
      throw new Error("Invalid card index");
    }

    // Calculate card effects (direction, mustDraw, skipNext)
    const cardEffects = applyCardEffect(
      playedCard,
      game.state.direction,
      game.state.mustDraw,
    );

    // Handle reverse in 2-player game (acts as skip)
    const reverseSkip =
      playedCard.kind === "special" &&
      playedCard.value === "reverse" &&
      game.players.length === 2;
    const skipNext = cardEffects.skipNext || reverseSkip;

    // Calculate next player
    const currentIndex = game.players.indexOf(playerId);
    const nextPlayerId = getNextPlayerId(
      game.players,
      currentIndex,
      cardEffects.direction,
      skipNext,
    );

    // Check if player wins after playing this card
    const newHandSize = playerHand.hand.length - 1;
    const isWinner = newHandSize === 0;

    return {
      effects: [
        {
          type: "update-game",
          updates: {
            "state.direction": cardEffects.direction,
            "state.mustDraw": cardEffects.mustDraw,
            "state.currentColor":
              playedCard.kind === "wild" ? chosenColor : null,
            "state.currentTurnPlayerId": isWinner ? null : nextPlayerId,
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
