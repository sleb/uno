import { ErrorCode, ValidationError } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createWildDraw4Rule = (): Rule => ({
  name: "wild-draw4-validation",
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

    // Verify the card is actually a Wild Draw Four (even though rule is permissive)
    if (playedCard.kind !== "wild" || playedCard.value !== "wild_draw4") {
      throw new ValidationError(
        ErrorCode.INVALID_ACTION,
        "This rule only handles Wild Draw Four cards",
        { card: playedCard },
      );
    }

    // Wild Draw Four can now be played at any time, no restriction on matching colors
    // This is a more relaxed rule that gives players more strategic options
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
