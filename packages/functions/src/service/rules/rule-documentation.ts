/**
 * Rule Documentation Metadata System
 *
 * Defines metadata for documenting game rules, including descriptions,
 * examples, and effects. This enables auto-generation of rule references
 * and documentation.
 */

/**
 * Metadata describing a game rule
 */
export interface RuleDocumentation {
  /** Rule identifier */
  id: string;

  /** Human-readable rule name */
  name: string;

  /** Rule execution phase */
  phase: "pre-validate" | "validate" | "apply" | "finalize";

  /** Short one-line description */
  description: string;

  /** Detailed explanation of what the rule does */
  details: string;

  /** Example scenario showing the rule in action */
  example?: string;

  /** Expected outcomes when rule is applied */
  outcomes?: string[];

  /** Related rules that interact with this rule */
  relatedRules?: string[];

  /** Game mechanics this rule affects */
  affectsGameState?: string[];
}

/**
 * Collection of rule documentation
 */
export interface RuleDocumentationMap {
  [ruleId: string]: RuleDocumentation;
}

/**
 * Built-in rule documentation
 */
export const RULE_DOCUMENTATION: RuleDocumentationMap = {
  "turn-ownership": {
    id: "turn-ownership",
    name: "Turn Ownership",
    phase: "pre-validate",
    description: "Validates that the player owns the current turn",
    details:
      "Checks that the acting player matches the current turn player ID. Throws an error if the player is not the current turn owner.",
    example:
      "Player 1 tries to play a card when it's Player 2's turn. The rule throws an error and prevents the action.",
    outcomes: [
      "✓ Allows action when player owns turn",
      "✗ Throws error when wrong player acts",
      "✗ Throws error when game is not in progress",
    ],
    relatedRules: ["pass-action-validate"],
    affectsGameState: ["Turn ownership"],
  },

  "card-playable": {
    id: "card-playable",
    name: "Card Playable",
    phase: "validate",
    description: "Validates that a played card matches game state",
    details:
      "Checks if the card matches the top discard pile card by color or value, or if it's a wild card. Respects stacking rules and current color from wild cards.",
    example:
      "Player plays a Blue 5 on top of Blue 3. Rule passes. Player plays Red 5 on Blue 3. Rule fails because colors don't match.",
    outcomes: [
      "✓ Allows card if matches top card",
      "✓ Allows wild cards anytime",
      "✓ Allows draw cards if stacking enabled",
      "✗ Throws error if card doesn't match",
    ],
    relatedRules: ["wild-color", "apply-card-effect"],
    affectsGameState: ["Card validity"],
  },

  "wild-color": {
    id: "wild-color",
    name: "Wild Color Selection",
    phase: "validate",
    description: "Validates that wild cards have a color selected",
    details:
      "Requires that all wild and wild draw4 cards have a chosenColor specified in the action. Throws error if wild card is played without color selection.",
    example:
      "Player plays a wild card and chooses Red. Rule passes. Player plays wild without choosing color. Rule throws error.",
    outcomes: [
      "✓ Allows wild with chosenColor",
      "✗ Throws error for wild without color",
      "✗ Throws error for wild draw4 without color",
    ],
    relatedRules: ["card-playable", "apply-card-effect"],
    affectsGameState: ["Card color"],
  },

  "apply-card-effect": {
    id: "apply-card-effect",
    name: "Apply Card Effect",
    phase: "apply",
    description: "Applies card effects to game state",
    details:
      "Applies the effects of the played card (e.g., draw cards, skip next player, reverse direction, set current color for wild). Calculates next turn player based on card type.",
    example:
      "Player plays Skip card. Next player is skipped. Player plays Reverse in 3-player game. Direction changes. Player plays Wild +4 Red. 4 cards drawn, color set to red.",
    outcomes: [
      "Updates turn player",
      "Sets draw count for draw cards",
      "Changes direction for reverse",
      "Sets current color for wild cards",
    ],
    relatedRules: ["turn-action-rule", "draw-action-apply"],
    affectsGameState: ["Game state", "Turn player", "Draw count", "Card color"],
  },

  "update-discard-pile": {
    id: "update-discard-pile",
    name: "Update Discard Pile",
    phase: "apply",
    description: "Moves played card to discard pile",
    details:
      "Adds the played card to the discard pile and updates lastActivityAt timestamp. Also marks game as completed if last player wins.",
    example:
      "Player plays Blue 5. Blue 5 is added to discard pile. lastActivityAt is updated.",
    outcomes: [
      "Card added to discard pile",
      "lastActivityAt timestamp updated",
      "Game status may change if player wins",
    ],
    relatedRules: ["apply-card-effect"],
    affectsGameState: ["Discard pile", "Game status"],
  },

  "finalize-game": {
    id: "finalize-game",
    name: "Finalize Game",
    phase: "finalize",
    description: "Checks if game has a winner and triggers completion",
    details:
      "Checks if current player has no cards left. If so, fetches all necessary data and returns set-winner effect to complete the game.",
    example:
      "Player plays their last card. Rule detects empty hand and marks player as winner, finalizing the game.",
    outcomes: [
      "If player has cards: returns empty effects",
      "If player has no cards: returns set-winner effect",
    ],
    relatedRules: ["apply-card-effect"],
    affectsGameState: ["Game completion", "Winner"],
  },

  "draw-action-validate": {
    id: "draw-action-validate",
    name: "Draw Action Validate",
    phase: "validate",
    description: "Validates that a draw action is legal",
    details:
      "Validates that the draw count is positive and player is allowed to draw. Respects game state like mustDraw constraints.",
    example:
      "Player draws 1 card during normal play. Rule passes. Player tries to draw -1 cards. Rule throws error.",
    outcomes: [
      "✓ Allows positive draw count",
      "✗ Throws error for zero or negative draws",
    ],
    relatedRules: ["draw-action-apply"],
    affectsGameState: ["Draw actions"],
  },

  "draw-action-apply": {
    id: "draw-action-apply",
    name: "Draw Action Apply",
    phase: "apply",
    description: "Applies card draws to player hand",
    details:
      "Removes cards from draw pile and adds them to player hand. Updates draw pile count and hand size. Decrements mustDraw counter if active.",
    example:
      "Player draws 2 cards. 2 cards removed from deck, added to hand. mustDraw decremented.",
    outcomes: [
      "Cards added to player hand",
      "Draw pile count updated",
      "mustDraw decremented if active",
    ],
    relatedRules: ["draw-action-validate"],
    affectsGameState: ["Player hand", "Draw pile"],
  },

  "pass-action-validate": {
    id: "pass-action-validate",
    name: "Pass Action Validate",
    phase: "validate",
    description: "Validates that a pass action is legal",
    details:
      "Validates that the player has completed their draw phase. Only allows pass when draw phase is done.",
    example:
      "Player draws cards, then passes turn. Rule passes. Player tries to pass without drawing. Rule throws error.",
    outcomes: [
      "✓ Allows pass after draw phase complete",
      "✗ Throws error if draw phase incomplete",
    ],
    relatedRules: ["pass-action-apply"],
    affectsGameState: ["Turn actions"],
  },

  "pass-action-apply": {
    id: "pass-action-apply",
    name: "Pass Action Apply",
    phase: "apply",
    description: "Applies pass action by transferring turn",
    details:
      "Moves turn to next player in rotation. Resets mustDraw counter if active.",
    example:
      "Player passes. Turn moves to next player in rotation. mustDraw reset to 0.",
    outcomes: [
      "Turn transferred to next player",
      "mustDraw reset if active",
      "Turn sequence updated",
    ],
    relatedRules: ["pass-action-validate"],
    affectsGameState: ["Turn player"],
  },

  "update-player-stats": {
    id: "update-player-stats",
    name: "Update Player Stats",
    phase: "apply",
    description: "Updates player game statistics",
    details:
      "Increments cardsPlayed, turnsPlayed, and specialCardsPlayed counters. Updates hasCalledUno and mustCallUno flags based on hand size.",
    example:
      "Player plays Skip card. cardsPlayed ++, specialCardsPlayed ++. Player plays last card. mustCallUno = true.",
    outcomes: [
      "cardsPlayed incremented",
      "turnsPlayed incremented",
      "specialCardsPlayed incremented for special cards",
      "UNO flags updated based on hand size",
    ],
    relatedRules: ["apply-card-effect"],
    affectsGameState: ["Player statistics"],
  },
};

/**
 * Get documentation for a single rule
 */
export function getRuleDocumentation(
  ruleId: string,
): RuleDocumentation | undefined {
  return RULE_DOCUMENTATION[ruleId];
}

/**
 * Get all documented rules
 */
export function getAllRuleDocumentation(): RuleDocumentation[] {
  return Object.values(RULE_DOCUMENTATION);
}

/**
 * Get rules by phase
 */
export function getRulesByPhase(
  phase: "pre-validate" | "validate" | "apply" | "finalize",
): RuleDocumentation[] {
  return getAllRuleDocumentation().filter((rule) => rule.phase === phase);
}

/**
 * Get rules that affect a specific game state
 */
export function getRulesByGameState(gameState: string): RuleDocumentation[] {
  return getAllRuleDocumentation().filter((rule) =>
    rule.affectsGameState?.includes(gameState),
  );
}

/**
 * Find related rules for a given rule
 */
export function findRelatedRules(ruleId: string): RuleDocumentation[] {
  const rule = getRuleDocumentation(ruleId);
  if (!rule || !rule.relatedRules) return [];

  return rule.relatedRules
    .map((id) => getRuleDocumentation(id))
    .filter((doc) => doc !== undefined) as RuleDocumentation[];
}
