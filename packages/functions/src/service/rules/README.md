# Rules Pipeline Architecture

The Rules Pipeline is a modular system for executing game logic as separate, composable rules that run through distinct phases. This document explains how the pipeline works, how to write rules, and best practices.

## Overview

The rules pipeline executes game actions (play card, draw, pass) through four distinct phases:

```
Pre-Validate → Validate → Apply → Finalize
```

Each phase has specific responsibilities and constraints. Rules are functions that produce **effects**, which are then applied to Firestore as atomic updates.

---

## Phases

### 1. Pre-Validate Phase
**Purpose**: Check game state, permissions, and initial conditions

**Constraints**:
- Validate-only (cannot produce apply effects)
- Runs before any gameplay rules
- Throws on first error (fail-fast)

**Examples**:
- Game is in progress
- Player owns current turn
- Player exists in game

### 2. Validate Phase
**Purpose**: Check card legality and action validity

**Constraints**:
- Validate-only (cannot produce apply effects)
- Runs after pre-validate
- Throws on first error (fail-fast)

**Examples**:
- Card is playable given game state
- Wild card has color selection
- Card matches discard pile (by color, value, or is wild)

### 3. Apply Phase
**Purpose**: Compute state mutations

**Constraints**:
- Cannot throw (use pre/validate phases for validation)
- Effects are aggregated (all applicable rules execute)
- Rules should be side-effect free

**Examples**:
- Calculate next player
- Compute card effects (draw penalty, skip, reverse)
- Update discard pile
- Update player stats

### 4. Finalize Phase
**Purpose**: Async operations and game completion

**Constraints**:
- Context is **stale** (pre-apply mutations)
- Rules can be async
- Should pre-fetch any needed data

**Important**: The context passed to finalize rules comes from _before_ the apply phase executed. This is intentional for atomicity. If your finalize rule needs post-apply data, fetch it explicitly in your method.

**Examples**:
- Pre-fetch data for game completion
- Calculate final scores
- Update user statistics

---

## Writing Rules

### Rule Structure

```typescript
import type { Rule, RuleContext, RuleResult } from "./types";

export const createMyRule = (): Rule => ({
  name: "my-rule",
  phase: "validate",  // or "pre-validate", "apply", "finalize"
  dependencies: ["game", "playerHand"],  // Optional: documents what context is needed

  canHandle: (ctx: RuleContext): boolean => {
    // Return true if this rule applies to the current action
    return ctx.action.type === "play";
  },

  validate: (ctx: RuleContext): void => {
    // Throw if validation fails (only for validate/pre-validate phases)
    if (!isValid) {
      throw new Error("Card cannot be played");
    }
  },

  apply: (ctx: RuleContext): RuleResult => {
    // Return effects (only for apply phase)
    return {
      effects: [
        {
          type: "update-game",
          updates: { "state.mustDraw": 2 },
        },
      ],
      cardsDrawn: [],
    };
  },

  finalize: async (ctx: RuleContext): Promise<RuleResult> => {
    // Optional: async work like pre-fetching (only for finalize phase)
    const allUsers = await fetchAllUsers();
    return {
      effects: [
        {
          type: "set-winner",
          winnerId: ctx.playerId,
          preFetchedData: { /* ... */ },
        },
      ],
      cardsDrawn: [],
    };
  },
});
```

### Rule Effect Types

Rules return effects, which describe immutable state changes:

#### `update-game`
Update top-level game state
```typescript
{
  type: "update-game",
  updates: {
    "state.mustDraw": 2,
    "state.direction": -1,
    lastActivityAt: now,
  },
}
```

#### `update-player`
Update a specific player's state
```typescript
{
  type: "update-player",
  playerId: "player1",
  updates: {
    cardCount: 5,
    "gameStats.cardsPlayed": 10,
  },
}
```

#### `update-hand`
Replace a player's card hand
```typescript
{
  type: "update-hand",
  playerId: "player1",
  hand: [card1, card2, card3],
}
```

#### `set-winner`
Mark game complete with final data
```typescript
{
  type: "set-winner",
  winnerId: "player1",
  preFetchedData: {
    game: gameData,
    playerHands: { /* all hands */ },
    gamePlayers: { /* all players */ },
    userDataMap: { /* user stats */ },
  },
}
```

---

## Context & Data Flow

### Context Lifecycle

1. **Initialization**: Context is populated once at the start of `playCard()`
   - Fetches current player, hand, game, and **all player hands**
   - All reads happen before any writes (Firestore transaction requirement)

2. **Pre-Validate Phase**: Context is current and complete
   - Game state is unmodified
   - All needed data is available

3. **Validate Phase**: Context is current and complete
   - Game state is unmodified
   - All needed data is available

4. **Apply Phase**: Context is current but rules produce mutations
   - **Effects are NOT reflected back into context**
   - Rules see original game state
   - All effects are collected and applied together at the end

5. **Finalize Phase**: Context is PRE-APPLY
   - **No apply-phase mutations are visible in context**
   - This is intentional for atomicity—see finalization as separate from mutation
   - If you need post-apply data, fetch it explicitly in your finalize method

### Important: Context Staleness in Finalize Phase

The finalize phase receives the **pre-apply context**. This design choice:
- ✅ Ensures atomicity (finalize decisions based on consistent snapshot)
- ✅ Prevents bugs from rules depending on mutation order
- ✅ Makes async operations safe without locking

If your finalize rule needs post-mutation data:

```typescript
async finalize(ctx: RuleContext): Promise<RuleResult> {
  // Get the current game state (POST-APPLY)
  const game = await getGame(ctx.gameId, ctx.transaction);

  // Use freshly-fetched data, not ctx.game
  const winner = /* determine from game */;

  return { /* ... */ };
}
```

---

## Error Handling

### Validation Phase (pre-validate, validate)
- **Throws on first error** (fail-fast)
- Transaction rolls back automatically
- Client receives error

### Apply Phase (apply, finalize)
- **Should not throw**
- Use pre/validate phases for validation
- Effects are aggregated and applied together

### Conflict Detection
The pipeline detects when multiple rules update the same field.

- If values differ, it throws with rule names included (transaction rolls back).
- If values are identical, it allows the update (last-write-wins).

Example error:
```
Effect conflict: game.mustDraw updated by apply-card-effect-rule and draw-action-apply-rule with different values
```

---

## Debugging

### Enable Logging
The pipeline logs executed rules at debug level:
```
[Pipeline] validate phase executed: card-playable-rule, wild-color-rule
[Pipeline] apply phase executed: apply-card-effect-rule, update-discard-pile-rule
```

### Check Effect Validation Warnings
Invalid field names in effects produce warnings:
```
[Rule Validation] Unknown game field: "typo_in_field" - may not exist in GameData
```

### Rule Dependencies
Declare what context your rule needs:
```typescript
dependencies: ["game", "playerHand", "player"],
```
This helps with documentation and future analysis tools.

---

## Best Practices

### Rule Design
1. ✅ Keep rules focused (one responsibility)
2. ✅ Use descriptive names (`card-playable-rule` not `validate-play`)
3. ✅ Declare dependencies for clarity and documentation
4. ✅ Put all validation in validate/pre-validate phases
5. ❌ Don't mutate (return effects instead)
6. ❌ Don't throw in apply/finalize phases

### Effect Design
1. ✅ Keep effects granular (one change per effect)
2. ✅ Use field paths consistently (`"state.mustDraw"` not `"state['mustDraw']"`)
3. ✅ Group related updates (all direction+mustDraw in one effect)
4. ❌ Don't update the same field from multiple rules (generates warnings)

### Testing
1. ✅ Test rule in isolation (canHandle, validate, apply)
2. ✅ Test effect production (verify correct effects returned)
3. ✅ Test integration (run full pipeline, verify Firestore updates)
4. ✅ Test error cases (validation failures in pre/validate)

---

## Example: Building a New Rule

Let's create a "Draw Penalty Validation" rule:

```typescript
import type { Rule, RuleContext, RuleResult } from "./types";

export const createDrawPenaltyRule = (): Rule => ({
  name: "draw-penalty-validation",
  phase: "validate",
  dependencies: ["game", "action"],

  canHandle: (ctx: RuleContext): boolean => {
    // Only apply to play actions when draw penalty is active
    return ctx.action.type === "play" && ctx.game.state.mustDraw > 0;
  },

  validate: (ctx: RuleContext): void => {
    const { game, playerHand, action } = ctx;

    if (action.type !== "play") return;

    const card = playerHand.hand[action.cardIndex];
    if (!card) {
      throw new Error("Invalid card index");
    }

    // Check if this is a draw card (can stack) or must fulfill penalty
    const isDrawCard = card.kind === "special" &&
      ["draw-two", "wild_draw4"].includes(card.value);

    if (!isDrawCard && game.config.houseRules.includes("stacking")) {
      // With stacking, must play draw card
      throw new Error("Must play a draw card to stack penalty");
    }

    if (!isDrawCard) {
      // Without stacking, must draw
      throw new Error("You must draw to satisfy penalty");
    }
  },

  apply: (ctx: RuleContext): RuleResult => {
    // No state changes—only validation
    return { effects: [], cardsDrawn: [] };
  },
});
```

---

## Registry & Composition

Rules are registered in [registry.ts](./registry.ts):

```typescript
export const createDefaultRulePipeline = (): RulePipeline => {
  const pipeline = createRulePipeline();

  // Pre-validate: Check permissions and game state
  pipeline["pre-validate"].push(createTurnOwnershipRule());

  // Validate: Check card legality
  pipeline.validate.push(
    createCardPlayableRule(),
    createWildColorRule(),
    createWildDraw4Rule(),
  );

  // Apply: Compute mutations
  pipeline.apply.push(
    createApplyCardEffectRule(),
    createUpdateDiscardPileRule(),
  );

  // Finalize: Async and completion
  pipeline.finalize.push(createFinalizeGameRule());

  return pipeline;
};
```

Add new rules by importing and pushing to the appropriate phase.

---

## Type Safety

All rules are fully typed with TypeScript discriminated unions. The compiler prevents:
- ❌ Returning wrong effect types
- ❌ Accessing non-existent context fields
- ❌ Violating phase constraints (validate rules can't apply)
- ❌ Invalid action types

---

## Future Enhancements

Potential extensions to the system:
- [ ] Dependency graph validation (detect circular deps)
- [ ] Rule composition (mix/match rules for different game modes)
- [ ] Effect replay (for undo/redo)
- [ ] Rule versioning (support rule changes over time)
- [ ] Metrics/perf tracking per rule
