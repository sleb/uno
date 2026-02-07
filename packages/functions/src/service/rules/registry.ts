import { createCardPlayableRule } from "./card-playable-rule";
import { createPlayActionRule } from "./play-action-rule";
import { createTurnOwnershipRule } from "./turn-ownership-rule";
import type { Rule } from "./types";
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
  pipeline["pre-validate"].push(createTurnOwnershipRule());
  pipeline.validate.push(
    createPlayActionRule(),
    createCardPlayableRule(),
    createWildColorRule(),
    createWildDraw4Rule(),
  );
  return pipeline;
};
