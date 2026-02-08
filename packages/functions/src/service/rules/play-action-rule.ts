import type { Rule, RuleContext, RuleResult } from "./types";

export const createPlayActionRule = (): Rule => ({
  name: "play-action-placeholder",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: () => {
    // Placeholder: keep existing validation in game-service.ts for now.
    // TODO: move play-specific validation here during rule extraction.
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
