import { describe, expect, test } from "bun:test";
import {
  generateDependencyGraphText,
  generateRuleInteractionMatrix,
  generateRuleReferenceHTML,
  generateRuleReferenceMarkdown,
  generateSummaryReport,
} from "./documentation-generator";
import { getAllRuleDocumentation, getRulesByPhase } from "./rule-documentation";

describe("Documentation Generator", () => {
  test("should generate HTML reference", () => {
    const doc = generateRuleReferenceHTML();

    expect(doc).toBeDefined();
    expect(doc.format).toBe("html");
    expect(doc.title).toContain("HTML");
    expect(doc.content).toContain("<!DOCTYPE html>");
    expect(doc.content).toContain("<title>UNO Game Rules Reference</title>");
    expect(doc.content).toContain("</html>");
  });

  test("should include all rules in HTML", () => {
    const doc = generateRuleReferenceHTML();
    const rules = getAllRuleDocumentation();

    for (const rule of rules) {
      expect(doc.content).toContain(rule.name);
      expect(doc.content).toContain(rule.id);
      expect(doc.content).toContain(rule.description);
    }
  });

  test("should include all phases in HTML", () => {
    const doc = generateRuleReferenceHTML();

    expect(doc.content).toContain("VALIDATE");
    expect(doc.content).toContain("APPLY");
    expect(doc.content).toContain("FINALIZE");
  });

  test("should generate markdown reference", () => {
    const doc = generateRuleReferenceMarkdown();

    expect(doc).toBeDefined();
    expect(doc.format).toBe("markdown");
    expect(doc.title).toContain("Markdown");
    expect(doc.content).toContain("# UNO Game Rules Reference");
    expect(doc.content).toContain("## Table of Contents");
  });

  test("should include all rules in markdown", () => {
    const doc = generateRuleReferenceMarkdown();
    const rules = getAllRuleDocumentation();

    for (const rule of rules) {
      expect(doc.content).toContain(rule.name);
      expect(doc.content).toContain(rule.description);
    }
  });

  test("should generate interaction matrix", () => {
    const doc = generateRuleInteractionMatrix();

    expect(doc).toBeDefined();
    expect(doc.format).toBe("markdown");
    expect(doc.title).toContain("Interaction Matrix");
    expect(doc.content).toContain("| Rule |");
    expect(doc.content).toContain("✓"); // Should have some interactions
  });

  test("should generate dependency graph", () => {
    const doc = generateDependencyGraphText();

    expect(doc).toBeDefined();
    expect(doc.format).toBe("markdown");
    expect(doc.title).toContain("Dependency");
    expect(doc.content).toContain("Rule Dependency Graph");
  });

  test("should include all rules in dependency graph", () => {
    const doc = generateDependencyGraphText();
    const rules = getAllRuleDocumentation();

    for (const rule of rules) {
      expect(doc.content).toContain(rule.name);
    }
  });

  test("should generate summary report", () => {
    const doc = generateSummaryReport();

    expect(doc).toBeDefined();
    expect(doc.format).toBe("markdown");
    expect(doc.title).toContain("Summary");
    expect(doc.content).toContain("# UNO Rules System Summary");
    expect(doc.content).toContain("## Statistics");
    expect(doc.content).toContain("Total Rules:");
  });

  test("should have correct rule counts in summary", () => {
    const doc = generateSummaryReport();
    const rules = getAllRuleDocumentation();

    // Check that total rules count is present
    expect(doc.content).toContain("Total Rules:");
    expect(doc.content).toContain(`${rules.length}`);

    const phases = ["pre-validate", "validate", "apply", "finalize"] as const;
    for (const phase of phases) {
      const count = getRulesByPhase(phase).length;
      if (count > 0) {
        expect(doc.content).toContain(`**${phase}:**`);
      }
    }
  });

  test("should have consistent rule IDs across documents", () => {
    const htmlDoc = generateRuleReferenceHTML();
    const markdownDoc = generateRuleReferenceMarkdown();
    const rules = getAllRuleDocumentation();

    for (const rule of rules) {
      expect(htmlDoc.content).toContain(`id="${rule.id}"`);
      expect(markdownDoc.content).toContain(`#${rule.id}`);
    }
  });

  test("should include rule details in markdown", () => {
    const doc = generateRuleReferenceMarkdown();
    const rules = getAllRuleDocumentation();

    for (const rule of rules) {
      if (rule.details) {
        expect(doc.content).toContain(rule.details);
      }
      if (rule.example) {
        expect(doc.content).toContain(rule.example);
      }
    }
  });

  test("should include all phases in summary", () => {
    const doc = generateSummaryReport();

    expect(doc.content).toContain("VALIDATE");
    expect(doc.content).toContain("APPLY");
    expect(doc.content).toContain("FINALIZE");
  });

  test("should generate valid documents", () => {
    const docs = [
      generateRuleReferenceHTML(),
      generateRuleReferenceMarkdown(),
      generateRuleInteractionMatrix(),
      generateDependencyGraphText(),
      generateSummaryReport(),
    ];

    for (const doc of docs) {
      expect(doc.title).toBeTruthy();
      expect(doc.content).toBeTruthy();
      expect(doc.format).toMatch(/html|markdown/);
      expect(doc.content.length).toBeGreaterThan(100);
    }
  });
});
