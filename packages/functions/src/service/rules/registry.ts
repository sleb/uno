import { createPlayActionRule } from "./play-action-rule";
import type { Rule } from "./types";
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
  pipeline.validate.push(createPlayActionRule(), createWildDraw4Rule());
  return pipeline;
};
