import type { RulePipeline, RulePipelinePhase } from "./registry";
import type { RuleContext, RuleResult } from "./types";

export const applyRulePhase = (
  pipeline: RulePipeline,
  phase: RulePipelinePhase,
  context: RuleContext,
): RuleResult => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"] = [];
  const shouldValidate = phase === "pre-validate" || phase === "validate";
  const shouldApply = phase === "apply";

  for (const rule of pipeline[phase]) {
    if (!rule.canHandle(context)) {
      continue;
    }

    if (shouldValidate) {
      rule.validate?.(context);
    }

    if (shouldApply) {
      const result = rule.apply(context);
      effects.push(...result.effects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  return { effects, cardsDrawn };
};

/**
 * Execute finalize phase rules for async operations and game completion
 *
 * IMPORTANT: The context passed to finalize rules is from before the apply phase
 * executed. This is intentional for atomicity—finalize rules should pre-fetch any
 * data they need rather than relying on mutations from the apply phase.
 * If you need post-apply data, fetch it explicitly in your finalize method.
 */
export const applyFinalizePhase = async (
  pipeline: RulePipeline,
  context: RuleContext,
): Promise<RuleResult> => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"] = [];

  for (const rule of pipeline.finalize) {
    if (!rule.canHandle(context)) {
      continue;
    }

    if (rule.finalize) {
      const result = await rule.finalize(context);
      effects.push(...result.effects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  return { effects, cardsDrawn };
};
