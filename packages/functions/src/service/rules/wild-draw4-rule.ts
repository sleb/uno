import { ErrorCode, ValidationError } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createWildDraw4Rule = (): Rule => ({
  name: "wild-draw4-validation",
  canHandle: (context: RuleContext) => {
    if (context.action.type !== "play") {
      return false;
    }
    const playedCard = context.playerHand.hand[context.action.cardIndex];
    return playedCard?.kind === "wild" && playedCard?.value === "wild_draw4";
  },
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

    // Wild Draw Four can now be played at any time, no restriction on matching colors
    // This is a more relaxed rule that gives players more strategic options
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
