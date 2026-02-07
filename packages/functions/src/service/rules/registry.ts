import { createApplyCardEffectRule } from "./apply-card-effect-rule";
import { createCardPlayableRule } from "./card-playable-rule";
import { createFinalizeGameRule } from "./finalize-game-rule";
import { createPlayActionRule } from "./play-action-rule";
import { createTurnOwnershipRule } from "./turn-ownership-rule";
import type { Rule } from "./types";
import { createUpdateDiscardPileRule } from "./update-discard-pile-rule";
import { createUpdatePlayerHandRule } from "./update-player-hand-rule";
import { createUpdatePlayerStatsRule } from "./update-player-stats-rule";
import { createWildColorRule } from "./wild-color-rule";
import { createWildDraw4Rule } from "./wild-draw4-rule";

export type RulePipelinePhase =
  | "pre-validate"
  | "validate"
  | "apply"
  | "finalize";

export const RULE_PIPELINE_PHASES: RulePipelinePhase[] = [
  "pre-validate",
  "validate",
  "apply",
  "finalize",
];

export type RulePipeline = Record<RulePipelinePhase, Rule[]>;

export const createRulePipeline = (): RulePipeline => ({
  "pre-validate": [],
  validate: [],
  apply: [],
  finalize: [],
});

export const createDefaultRulePipeline = (): RulePipeline => {
  const pipeline = createRulePipeline();

  // Pre-validate: Check game state and turn ownership
  pipeline["pre-validate"].push(createTurnOwnershipRule());

  // Validate: Check card legality and action validity
  pipeline.validate.push(
    createPlayActionRule(),
    createCardPlayableRule(),
    createWildColorRule(),
    createWildDraw4Rule(),
  );

  // Apply: Execute state mutations
  pipeline.apply.push(
    createApplyCardEffectRule(), // Calculate card effects and next player
    createUpdateDiscardPileRule(), // Update discard pile and game status
    createUpdatePlayerHandRule(), // Remove card from hand
    createUpdatePlayerStatsRule(), // Update player stats and UNO flags
  );

  // Finalize: Handle game completion
  pipeline.finalize.push(createFinalizeGameRule());

  return pipeline;
};
