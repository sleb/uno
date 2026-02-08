import { validateDependencies } from "./dependency-validation";
import { validateEffect } from "./effect-validation";
import type { RulePipeline, RulePipelinePhase } from "./registry";
import type { RuleContext, RuleResult } from "./types";

/**
 * Execute rules for a specific phase with debug logging and validation
 * @param pipeline The rule pipeline
 * @param phase The phase to execute
 * @param context The rule execution context
 * @returns Aggregated effects and cards drawn
 */
export const applyRulePhase = (
  pipeline: RulePipeline,
  phase: RulePipelinePhase,
  context: RuleContext,
): RuleResult => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"] = [];
  const shouldValidate = phase === "pre-validate" || phase === "validate";
  const shouldApply = phase === "apply";

  const executedRules: string[] = [];

  for (const rule of pipeline[phase]) {
    if (!rule.canHandle(context)) {
      continue;
    }

    executedRules.push(rule.name);

    // Validate dependencies if declared
    if (rule.dependencies) {
      validateDependencies(rule.name, rule.dependencies, context);
    }

    if (shouldValidate) {
      rule.validate?.(context);
    }

    if (shouldApply) {
      const result = rule.apply(context);

      // Validate effects have valid field names
      for (const effect of result.effects) {
        validateEffect(effect);
      }

      const taggedEffects = result.effects.map((effect) => ({
        ...effect,
        sourceRule: rule.name,
      }));

      effects.push(...taggedEffects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  // Log rule execution for debugging (only when rules execute)
  if (executedRules.length > 0) {
    console.debug(
      `[Pipeline] ${phase} phase executed: ${executedRules.join(", ")}`,
    );
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
  const executedRules: string[] = [];

  for (const rule of pipeline.finalize) {
    if (!rule.canHandle(context)) {
      continue;
    }

    executedRules.push(rule.name);

    // Validate dependencies if declared
    if (rule.dependencies) {
      validateDependencies(rule.name, rule.dependencies, context);
    }

    if (rule.finalize) {
      const result = await rule.finalize(context);

      // Validate effects have valid field names
      for (const effect of result.effects) {
        validateEffect(effect);
      }

      const taggedEffects = result.effects.map((effect) => ({
        ...effect,
        sourceRule: rule.name,
      }));

      effects.push(...taggedEffects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  // Log rule execution for debugging (only when rules execute)
  if (executedRules.length > 0) {
    console.debug(
      `[Pipeline] finalize phase executed: ${executedRules.join(", ")}`,
    );
  }

  return { effects, cardsDrawn };
};
