import type { Card } from "@uno/shared";
import { isCardPlayable } from "../card-validation";
import type { Rule, RuleContext, RuleResult } from "./types";

const getTopCard = (discardPile: Card[]): Card => {
  const topCard = discardPile[discardPile.length - 1];

  if (!topCard) {
    throw new Error("Discard pile is empty");
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
      throw new Error("Invalid card index");
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
      throw new Error("Card cannot be played");
    }
  },
  apply: (): RuleResult => ({ effects: [] }),
});
