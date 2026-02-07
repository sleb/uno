import type { RulePipeline, RulePipelinePhase } from "./registry";
import type { RuleContext, RuleResult } from "./types";

export const applyRulePhase = (
  pipeline: RulePipeline,
  phase: RulePipelinePhase,
  context: RuleContext,
): RuleResult => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"];
  const shouldValidate = phase === "pre-validate" || phase === "validate";
  const shouldApply = phase === "apply" || phase === "finalize";

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

      if (result.cardsDrawn) {
        cardsDrawn = [...(cardsDrawn ?? []), ...result.cardsDrawn];
      }
    }
  }

  return { effects, cardsDrawn };
};
