import { describe, expect, test } from "bun:test";
import {
  generateDependencyReport,
  validateDependencies,
} from "./dependency-validation";
import type { RuleContext } from "./types";

describe("dependency-validation", () => {
  test("validateDependencies allows when all dependencies present", () => {
    const context = {
      game: { id: "game-1" },
      playerHand: { hand: [] },
    } as unknown as RuleContext;

    expect(() =>
      validateDependencies("test-rule", ["game", "playerHand"], context),
    ).not.toThrow();
  });

  test("validateDependencies throws when dependency missing", () => {
    const context = {
      game: { id: "game-1" },
    } as unknown as RuleContext;

    expect(() =>
      validateDependencies("test-rule", ["game", "playerHand"], context),
    ).toThrow(/missing required dependency.*playerHand/);
  });

  test("validateDependencies throws when dependency is undefined", () => {
    const context = {
      game: { id: "game-1" },
      playerHand: undefined,
    } as unknown as RuleContext;

    expect(() =>
      validateDependencies("test-rule", ["game", "playerHand"], context),
    ).toThrow(/missing required dependency.*playerHand/);
  });

  test("generateDependencyReport shows all rules and deps", () => {
    const rules = [
      { name: "rule-a", dependencies: ["game", "playerHand"] as const },
      { name: "rule-b", dependencies: undefined },
      { name: "rule-c", dependencies: ["game"] as const },
    ];

    const report = generateDependencyReport(rules);

    expect(report).toContain("rule-a: game, playerHand");
    expect(report).toContain("rule-b: (no declared dependencies)");
    expect(report).toContain("rule-c: game");
  });
});
