import type { Card } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

const getTopCard = (discardPile: Card[]): Card => {
  const topCard = discardPile[discardPile.length - 1];

  if (!topCard) {
    throw new Error("Discard pile is empty");
  }

  return topCard;
};

export const createWildDraw4Rule = (): Rule => ({
  name: "wild-draw4-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    if (context.action.type !== "play") {
      return;
    }

    const playedCard = context.playerHand.hand[context.action.cardIndex];

    if (!playedCard) {
      throw new Error("Invalid card index");
    }

    if (!(playedCard.kind === "wild" && playedCard.value === "wild_draw4")) {
      return;
    }

    const { currentColor, mustDraw, discardPile } = context.game.state;
    const topCard = getTopCard(discardPile);
    const activeColor =
      currentColor ?? (topCard.kind === "wild" ? null : topCard.color);

    if (mustDraw === 0 && activeColor) {
      const hasColorMatch = context.playerHand.hand.some(
        (card, index) =>
          index !== context.action.cardIndex &&
          "color" in card &&
          card.color === activeColor,
      );

      if (hasColorMatch) {
        throw new Error(
          "Wild Draw Four can only be played when you have no matching color",
        );
      }
    }
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
