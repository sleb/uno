import type { RuleContext } from "./types";

/**
 * Validates that all declared dependencies for a rule are present in the context
 * @param ruleName - The name of the rule
 * @param dependencies - List of required context fields
 * @param context - The rule context to check
 * @throws If any dependency is missing or undefined
 */
export const validateDependencies = (
  ruleName: string,
  dependencies: (keyof RuleContext)[] | undefined,
  context: RuleContext,
): void => {
  if (!dependencies || dependencies.length === 0) {
    return;
  }

  for (const dep of dependencies) {
    const value = context[dep];
    if (value === undefined || value === null) {
      throw new Error(
        `Rule "${ruleName}" is missing required dependency: ${String(dep)}`,
      );
    }
  }
};

/**
 * Generates a dependency report for all rules in the pipeline
 * Useful for debugging rule configuration
 */
export const generateDependencyReport = (
  rules: Array<{ name: string; dependencies?: (keyof RuleContext)[] }>,
): string => {
  const lines: string[] = ["=== Rule Dependency Report ==="];

  for (const rule of rules) {
    if (!rule.dependencies || rule.dependencies.length === 0) {
      lines.push(`${rule.name}: (no declared dependencies)`);
    } else {
      lines.push(`${rule.name}: ${rule.dependencies.join(", ")}`);
    }
  }

  return lines.join("\n");
};
