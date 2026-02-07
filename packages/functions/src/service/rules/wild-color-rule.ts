import type { Rule, RuleContext, RuleResult } from "./types";

export const createWildColorRule = (): Rule => ({
  name: "wild-color-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    if (context.action.type !== "play") {
      return;
    }

    const playedCard = context.playerHand.hand[context.action.cardIndex];

    if (!playedCard) {
      throw new Error("Invalid card index");
    }

    if (playedCard.kind === "wild" && !context.action.chosenColor) {
      throw new Error("Wild card requires chosen color");
    }
  },
  apply: (): RuleResult => ({ effects: [] }),
});
