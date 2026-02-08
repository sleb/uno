import { ErrorCode, ValidationError } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createDrawActionValidateRule = (): Rule => ({
  name: "draw-action-validation",
  phase: "validate",

  canHandle: (ctx: RuleContext): boolean => ctx.action.type === "draw",

  validate: (ctx: RuleContext): void => {
    if (ctx.action.type !== "draw") {
      return;
    }

    if (ctx.action.count < 1) {
      throw new ValidationError(
        ErrorCode.INVALID_ACTION,
        "Draw count must be at least 1",
        { count: ctx.action.count },
      );
    }
  },

  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
