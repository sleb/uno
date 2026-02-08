import type { Rule, RuleContext, RuleResult } from "./types";

export const createPassActionValidateRule = (): Rule => ({
  name: "pass-action-validation",
  phase: "validate",

  canHandle: (ctx: RuleContext): boolean => ctx.action.type === "pass",

  validate: (ctx: RuleContext): void => {
    if (ctx.action.type !== "pass") {
      return;
    }

    if (ctx.game.state.mustDraw > 0) {
      throw new Error("You must draw cards before passing");
    }
  },

  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
