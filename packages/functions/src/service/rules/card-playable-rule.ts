import type { Card } from "@uno/shared";
import { ErrorCode, ValidationError } from "@uno/shared";
import { isCardPlayable } from "../card-validation";
import type { Rule, RuleContext, RuleResult } from "./types";

const getTopCard = (discardPile: Card[]): Card => {
  const topCard = discardPile[discardPile.length - 1];

  if (!topCard) {
    throw new ValidationError(
      ErrorCode.INVALID_ACTION,
      "Discard pile is empty",
      {},
    );
  }

  return topCard;
};

export const createCardPlayableRule = (): Rule => ({
  name: "card-playable-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    if (context.action.type !== "play") {
      return;
    }

    const playedCard = context.playerHand.hand[context.action.cardIndex];

    if (!playedCard) {
      throw new ValidationError(
        ErrorCode.INVALID_ACTION,
        "Invalid card index",
        { cardIndex: context.action.cardIndex },
      );
    }

    const topCard = getTopCard(context.game.state.discardPile);
    const { currentColor, mustDraw } = context.game.state;

    if (
      !isCardPlayable(
        playedCard,
        topCard,
        currentColor,
        mustDraw,
        context.game.config.houseRules,
      )
    ) {
      throw new ValidationError(
        ErrorCode.CARD_CANNOT_BE_PLAYED,
        "Card cannot be played",
        { playedCard, topCard },
      );
    }
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
