/**
 * Documentation Generator
 *
 * Generates HTML and markdown documentation from rule metadata.
 * Produces rule references, dependency graphs, and game flow diagrams.
 */

import {
  findRelatedRules,
  getAllRuleDocumentation,
  getRulesByPhase,
  type RuleDocumentation,
} from "./rule-documentation";

interface GeneratedDoc {
  title: string;
  content: string;
  format: "html" | "markdown";
}

/**
 * Generate HTML rule reference documentation
 */
export function generateRuleReferenceHTML(): GeneratedDoc {
  const rules = getAllRuleDocumentation();
  const phases = ["pre-validate", "validate", "apply", "finalize"];

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UNO Game Rules Reference</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #222; margin-bottom: 10px; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
    h2 { color: #444; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #007bff; padding-left: 10px; }
    h3 { color: #555; margin-top: 20px; margin-bottom: 10px; }
    .rule-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 4px solid #28a745;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .rule-title {
      font-size: 1.4em;
      color: #222;
    }
    .phase-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: bold;
      text-transform: uppercase;
    }
    .phase-pre-validate { background: #e7f3ff; color: #004085; }
    .phase-validate { background: #fff3cd; color: #856404; }
    .phase-apply { background: #d4edda; color: #155724; }
    .phase-finalize { background: #d1ecf1; color: #0c5460; }
    .rule-description {
      font-size: 0.95em;
      color: #666;
      margin: 10px 0;
      font-style: italic;
    }
    .rule-details {
      margin: 15px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #ddd;
    }
    .rule-example {
      margin: 15px 0;
      padding: 10px;
      background: #e8f4f8;
      border-radius: 4px;
      border-left: 3px solid #17a2b8;
    }
    .outcomes {
      margin: 15px 0;
    }
    .outcome {
      margin: 8px 0;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .outcome.success { border-left: 3px solid #28a745; }
    .outcome.failure { border-left: 3px solid #dc3545; }
    .related-rules {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    .related-rules h4 {
      color: #666;
      margin-bottom: 8px;
    }
    .related-rule {
      display: inline-block;
      padding: 4px 10px;
      margin: 4px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .toc {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      border-left: 4px solid #6f42c1;
    }
    .toc h2 { border-left-color: #6f42c1; margin-top: 0; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc li { margin: 8px 0; }
    .toc a { color: #007bff; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .phase-section { margin-bottom: 40px; }
    footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 UNO Game Rules Reference</h1>
    <p style="color: #666; margin-bottom: 30px;">Auto-generated documentation of all game rules and their interactions.</p>

    <!-- Table of Contents -->
    <div class="toc">
      <h2>Table of Contents</h2>
      <ul>`;

  // Add TOC entries
  for (const phase of phases) {
    const phaseRules = getRulesByPhase(phase as any);
    if (phaseRules.length > 0) {
      html += `<li><strong>${phase.replace("-", " ").toUpperCase()}</strong><ul>`;
      for (const rule of phaseRules) {
        html += `<li><a href="#${rule.id}">${rule.name}</a></li>`;
      }
      html += `</ul></li>`;
    }
  }

  html += `</ul></div>`;

  // Generate rule sections by phase
  for (const phase of phases) {
    const phaseRules = getRulesByPhase(phase as any);
    if (phaseRules.length === 0) continue;

    const phaseName = phase.replace(/-/g, " ").toUpperCase();
    html += `<div class="phase-section"><h2>${phaseName} Phase</h2>`;

    for (const rule of phaseRules) {
      html += generateRuleCardHTML(rule);
    }

    html += `</div>`;
  }

  // Footer
  html += `
    <footer>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <p>UNO Game Rules Documentation | Phase 9: Documentation Generation</p>
    </footer>
  </div>
</body>
</html>`;

  return {
    title: "Rule Reference - HTML",
    content: html,
    format: "html",
  };
}

/**
 * Generate a single rule card in HTML
 */
function generateRuleCardHTML(rule: RuleDocumentation): string {
  const relatedRules = findRelatedRules(rule.id);

  let html = `
    <div class="rule-card" id="${rule.id}">
      <div class="rule-header">
        <span class="rule-title">${rule.name}</span>
        <span class="phase-badge phase-${rule.phase}">${rule.phase.replace("-", " ")}</span>
      </div>
      <div class="rule-description">${rule.description}</div>`;

  if (rule.details) {
    html += `<div class="rule-details"><strong>Details:</strong> ${rule.details}</div>`;
  }

  if (rule.example) {
    html += `<div class="rule-example"><strong>Example:</strong> ${rule.example}</div>`;
  }

  if (rule.outcomes && rule.outcomes.length > 0) {
    html += `<div class="outcomes"><strong>Outcomes:</strong>`;
    for (const outcome of rule.outcomes) {
      const isSuccess = outcome.startsWith("✓");
      const outcomeClass = isSuccess ? "success" : "failure";
      html += `<div class="outcome ${outcomeClass}">${outcome}</div>`;
    }
    html += `</div>`;
  }

  if (rule.affectsGameState && rule.affectsGameState.length > 0) {
    html += `<div style="margin-top: 10px;"><strong>Affects:</strong> ${rule.affectsGameState.join(", ")}</div>`;
  }

  if (relatedRules.length > 0) {
    html += `<div class="related-rules">
      <h4>Related Rules:</h4>`;
    for (const related of relatedRules) {
      html += `<span class="related-rule"><a href="#${related.id}">${related.name}</a></span>`;
    }
    html += `</div>`;
  }

  html += `</div>`;

  return html;
}

/**
 * Generate markdown rule reference
 */
export function generateRuleReferenceMarkdown(): GeneratedDoc {
  const rules = getAllRuleDocumentation();
  const phases = ["pre-validate", "validate", "apply", "finalize"];

  let markdown = `# UNO Game Rules Reference

> Auto-generated documentation of all game rules and their interactions.
> Generated: ${new Date().toLocaleString()}

## Table of Contents\n\n`;

  // TOC
  for (const phase of phases) {
    const phaseRules = getRulesByPhase(phase as any);
    if (phaseRules.length > 0) {
      markdown += `- **${phase.replace(/-/g, " ").toUpperCase()}**\n`;
      for (const rule of phaseRules) {
        markdown += `  - [${rule.name}](#${rule.id})\n`;
      }
    }
  }

  markdown += `\n---\n\n`;

  // Rules by phase
  for (const phase of phases) {
    const phaseRules = getRulesByPhase(phase as any);
    if (phaseRules.length === 0) continue;

    const phaseName = phase.replace(/-/g, " ").toUpperCase();
    markdown += `## ${phaseName} Phase\n\n`;

    for (const rule of phaseRules) {
      markdown += generateRuleMarkdown(rule);
      markdown += `\n---\n\n`;
    }
  }

  return {
    title: "Rule Reference - Markdown",
    content: markdown,
    format: "markdown",
  };
}

/**
 * Generate a single rule in markdown
 */
function generateRuleMarkdown(rule: RuleDocumentation): string {
  const relatedRules = findRelatedRules(rule.id);

  let markdown = `### ${rule.name}\n\n`;
  markdown += `**Phase:** \`${rule.phase}\`\n\n`;
  markdown += `**Description:** ${rule.description}\n\n`;

  if (rule.details) {
    markdown += `**Details:**\n${rule.details}\n\n`;
  }

  if (rule.example) {
    markdown += `**Example:**\n\`\`\`\n${rule.example}\n\`\`\`\n\n`;
  }

  if (rule.outcomes && rule.outcomes.length > 0) {
    markdown += `**Outcomes:**\n`;
    for (const outcome of rule.outcomes) {
      markdown += `- ${outcome}\n`;
    }
    markdown += `\n`;
  }

  if (rule.affectsGameState && rule.affectsGameState.length > 0) {
    markdown += `**Affects Game State:** ${rule.affectsGameState.join(", ")}\n\n`;
  }

  if (relatedRules.length > 0) {
    markdown += `**Related Rules:** `;
    markdown += relatedRules.map((r) => `[${r.name}](#${r.id})`).join(", ");
    markdown += `\n\n`;
  }

  markdown += `**Rule ID:** \`${rule.id}\`\n`;

  return markdown;
}

/**
 * Generate rule interaction matrix showing which rules interact
 */
export function generateRuleInteractionMatrix(): GeneratedDoc {
  const rules = getAllRuleDocumentation();
  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  let markdown = `# Rule Interaction Matrix\n\n`;
  markdown += `> Shows which rules interact or relate to each other\n> Generated: ${new Date().toLocaleString()}\n\n`;

  markdown += `## Legend\n`;
  markdown += `- ✓ Rules are related or interact\n`;
  markdown += `- (empty) No documented interaction\n\n`;

  // Create matrix
  markdown += `| Rule | `;
  for (const rule of rules) {
    markdown += `${rule.name.substring(0, 8)}. | `;
  }
  markdown += `\n`;

  markdown += `|${Array(rules.length + 1)
    .fill("---")
    .join("|")}|\n`;

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    markdown += `| ${rule.name} | `;

    for (let j = 0; j < rules.length; j++) {
      const other = rules[j];
      const hasRelation =
        rule.id === other.id ||
        rule.relatedRules?.includes(other.id) ||
        other.relatedRules?.includes(rule.id);

      markdown += hasRelation ? "✓ | " : "  | ";
    }
    markdown += `\n`;
  }

  return {
    title: "Rule Interaction Matrix",
    content: markdown,
    format: "markdown",
  };
}

/**
 * Generate dependency graph in text format
 */
export function generateDependencyGraphText(): GeneratedDoc {
  const rules = getAllRuleDocumentation();

  let text = `Rule Dependency Graph\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `${"=".repeat(50)}\n\n`;

  for (const rule of rules) {
    text += `${rule.name} (${rule.phase})\n`;

    if (rule.relatedRules && rule.relatedRules.length > 0) {
      for (const relatedId of rule.relatedRules) {
        const related = rules.find((r) => r.id === relatedId);
        if (related) {
          text += `  → ${related.name}\n`;
        }
      }
    } else {
      text += `  (no related rules)\n`;
    }

    text += `\n`;
  }

  return {
    title: "Dependency Graph",
    content: text,
    format: "markdown",
  };
}

/**
 * Generate a summary report
 */
export function generateSummaryReport(): GeneratedDoc {
  const rules = getAllRuleDocumentation();
  const phases = ["pre-validate", "validate", "apply", "finalize"];

  let report = `# UNO Rules System Summary\n\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;

  report += `## Statistics\n\n`;
  report += `- **Total Rules:** ${rules.length}\n`;

  for (const phase of phases) {
    const count = rules.filter((r) => r.phase === phase).length;
    report += `- **${phase}:** ${count} rules\n`;
  }

  report += `\n## Rules by Phase\n\n`;

  for (const phase of phases) {
    const phaseRules = rules.filter((r) => r.phase === phase);
    report += `### ${phase.replace(/-/g, " ").toUpperCase()}\n\n`;
    for (const rule of phaseRules) {
      report += `- **${rule.name}** - ${rule.description}\n`;
    }
    report += `\n`;
  }

  // Game state coverage
  const gameStates = new Set<string>();
  for (const rule of rules) {
    if (rule.affectsGameState) {
      for (const state of rule.affectsGameState) {
        gameStates.add(state);
      }
    }
  }

  report += `## Game State Coverage\n\n`;
  report += `${Array.from(gameStates).join(", ")}\n\n`;

  // Interaction stats
  let totalRelations = 0;
  for (const rule of rules) {
    if (rule.relatedRules) {
      totalRelations += rule.relatedRules.length;
    }
  }

  report += `## Interaction Statistics\n\n`;
  report += `- **Total Relationships:** ${totalRelations}\n`;
  report += `- **Average Interactions per Rule:** ${(totalRelations / rules.length).toFixed(1)}\n`;

  return {
    title: "Summary Report",
    content: report,
    format: "markdown",
  };
}
