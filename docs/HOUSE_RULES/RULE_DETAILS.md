# House Rules - Implementation Details for Developers

This document provides implementation guidance, code patterns, and examples for building house rules.

## Architecture Overview

### Three-Layer Structure

```
Frontend (game-board.tsx)
    ↓ checks houseRules for card highlighting
Backend Validation (card-validation.ts)
    ↓ checks houseRules to determine playability
Game Logic (game-service.ts)
    ↓ applies houseRules-specific mutations
Firestore (game.config.houseRules)
    ↑ stores enabled rules in game config
```

### Key Design Patterns

1. **Rule Configuration** - Stored in `game.config.houseRules: string[]`
2. **Validation Separation** - Validation logic checks rules, doesn't mutate state
3. **Game Logic** - Mutations happen in game-service, pass `houseRules` to validation
4. **Frontend Binding** - Card highlighting respects rules from game config

---

## Adding a New House Rule: Step-by-Step Guide

### Phase 1: Define the Rule

**Update** `packages/shared/src/types.ts`:
```typescript
export const HouseRuleSchema = z.enum([
  "stacking",
  "jumpIn",
  "sevenSwap",
  "zeroRotation",
  "drawToMatch",
  "yourNewRule", // ← Add here
]);
```

### Phase 2: Write Tests (Before Implementation!)

#### Unit Test Template

Create tests in `packages/functions/src/service/house-rules-unit.test.ts`:

```typescript
describe("Your New Rule", () => {
  // Test 1: Verify rule disabled uses standard behavior
  test("should use standard behavior when rule disabled", () => {
    const card = { color: "RED", value: "5" };
    const isPlayable = isCardPlayable(
      card,
      topCard,
      currentColor,
      0,
      [] // No house rules
    );
    // Assert standard game behavior
  });

  // Test 2: Verify rule enabled changes behavior
  test("should apply house rule when enabled", () => {
    const card = { color: "RED", value: "7" };
    const isPlayable = isCardPlayable(
      card,
      topCard,
      currentColor,
      0,
      ["yourNewRule"] // Rule enabled
    );
    // Assert house rule behavior
  });

  // Test 3: Edge cases
  test("should handle edge case X", () => {
    // Edge case scenario
  });
});
```

#### Integration Test Template

Create tests in `packages/functions/src/service/house-rules.test.ts`:

```typescript
describe("Your New Rule Integration", () => {
  beforeAll(() => {
    // Setup Firebase emulator connection
  });

  test("should apply rule in real game without rule", async () => {
    const gameId = await createGame({ houseRules: [] });
    // Play game, verify standard behavior
  });

  test("should apply rule in game with rule enabled", async () => {
    const gameId = await createGame({ houseRules: ["yourNewRule"] });
    // Play game, verify house rule behavior
  });
});
```

### Phase 3: Implement Backend Validation

**Update** `packages/functions/src/service/card-validation.ts`:

```typescript
export const isCardPlayable = (
  card: Card,
  topCard: Card,
  currentColor: Color,
  mustDraw: number,
  houseRules: string[] = [], // ← Always add this parameter
): boolean => {
  // Standard validation first
  if (!matchesTopCard(card, topCard, currentColor)) {
    return false;
  }

  // Check house rule
  if (houseRules.includes("yourNewRule")) {
    if (card.value === "7") {
      // Your rule-specific validation
      return true;
    }
  }

  return true;
};
```

### Phase 4: Implement Game Logic

**Update** `packages/functions/src/service/game-service.ts`:

```typescript
export const playCard = async (
  gameId: string,
  playerId: string,
  cardIndex: number,
  t?: Transaction
): Promise<PlayCardResponse> => {
  const game = await getGame(gameId, t);

  // Always pass houseRules to validation
  const isPlayable = isCardPlayable(
    card,
    topCard,
    game.state.currentColor,
    game.state.mustDraw,
    game.config.houseRules // ← Pass this
  );

  if (!isPlayable) {
    throw new GameStateError(...);
  }

  // Standard play card logic
  // ...

  // Apply house rule effects
  if (game.config.houseRules.includes("yourNewRule")) {
    if (card.value === "7") {
      // Your rule-specific mutation
      t.update(gameRef(gameId), {
        // Update game state
      });
    }
  }

  return response;
};
```

### Phase 5: Implement Frontend

**Update** `packages/web/src/components/game/game-board.tsx`:

```typescript
const isPlayable = (card: Card): boolean => {
  // Check if card can be played given current game state

  const { houseRules } = game.config;

  if (game.state.mustDraw > 0) {
    // During draw penalty, only draw cards playable with stacking
    if (houseRules.includes("stacking") && isDrawCard(card)) {
      return true;
    }
    return false;
  }

  // Check house rule visibility
  if (houseRules.includes("yourNewRule")) {
    if (card.value === "7") {
      // Highlight cards affected by rule
      return true; // or custom highlight logic
    }
  }

  // Standard card playability
  return matchesTopCard(card);
};
```

### Phase 6: Document

**Update** documentation:
1. Add rule to `docs/HOUSE_RULES/README.md` - What it does
2. Add interaction matrix in `INTERACTIONS.md`
3. Add test status in `TESTING_STRATEGY.md`
4. Add implementation notes in `IMPLEMENTATION_STATUS.md`

---

## Stacking Rule: Implementation Details ✅

### Architecture

**Problem:** Players could stack Draw Two/Wild Draw Four cards even in standard games.

**Solution:** Validate rule is enabled before allowing draw card stacking.

### Validation Logic

```typescript
const isDrawCard = (card: Card): boolean => {
  return card.effect === "DRAW_TWO" || card.effect === "WILD_DRAW_FOUR";
};

export const isCardPlayable = (
  card: Card,
  topCard: Card,
  currentColor: Color,
  mustDraw: number,
  houseRules: string[] = [],
): boolean => {
  // Key: Check for stacking rule when determining playability
  if (mustDraw > 0) {
    // Penalty is active
    if (houseRules.includes("stacking") && isDrawCard(card)) {
      // With stacking rule, can play any draw card to continue stack
      return true;
    }
    // Without stacking rule, can't play anything
    return false;
  }

  // ... rest of playability checks
};
```

### Game State Mutation

```typescript
if (game.state.mustDraw > 0 && isDrawCard(card)) {
  // Stacking a draw penalty
  const penaltyAmount = card.effect === "DRAW_TWO" ? 2 : 4;
  t.update(gameRef(gameId), {
    "state.mustDraw": game.state.mustDraw + penaltyAmount,
    "state.lastActivityAt": now,
  });
}
```

### Test Pattern

```typescript
test("should allow stacking with rule enabled", async () => {
  const gameId = await createGame({ houseRules: ["stacking"] });

  // P1 plays Draw Two (mustDraw = 2)
  await playCard(gameId, p1, drawTwoIndex);

  // P2 can play another draw card (not just draw)
  const canPlay = await canPlayCard(gameId, p2, drawTwoIndex);
  expect(canPlay).toBe(true);
});

test("should block stacking without rule", async () => {
  const gameId = await createGame({ houseRules: [] });

  // P1 plays Draw Two (mustDraw = 2)
  await playCard(gameId, p1, drawTwoIndex);

  // P2 cannot play another draw card
  const canPlay = await canPlayCard(gameId, p2, drawTwoIndex);
  expect(canPlay).toBe(false);
});
```

---

## Draw to Match Rule: Implementation Details ✅

### Architecture

**Problem:** Players must pass after drawing 1 unplayable card, even if deck has playable cards.

**Solution:** Loop drawing cards until playable card found (or deck exhausted).

### Drawing Logic

```typescript
export const drawCard = async (
  gameId: string,
  playerId: string,
  count: number = 1,
  t?: Transaction
): Promise<DrawCardResponse> => {
  const game = await getGame(gameId, t);
  const player = await getPlayerHand(gameId, playerId, t);
  const { houseRules } = game.config;

  let drawnCards: Card[] = [];

  // Key: Determine if draw-to-match applies
  const isPenaltyDraw = game.state.mustDraw > 0;
  const isDrawToMatchEnabled =
    !isPenaltyDraw && houseRules.includes("drawToMatch");

  if (isDrawToMatchEnabled) {
    // Draw until playable card found
    let drawAttempts = 0;
    const maxDraws = 50; // Safety limit

    while (drawAttempts < maxDraws) {
      const card = drawFromDeck(game, playerId);
      drawnCards.push(card);
      drawAttempts++;

      // Check if playable
      if (isCardPlayable(
        card,
        game.state.discardPile[0],
        game.state.currentColor,
        0, // mustDraw = 0 for voluntary draws
        houseRules
      )) {
        // Found playable card, stop drawing
        break;
      }
    }
  } else {
    // Standard draw: exact count
    for (let i = 0; i < count; i++) {
      drawnCards.push(drawFromDeck(game, playerId));
    }
  }

  // Update Firestore with drawn cards
  t.update(playerHandRef(gameId, playerId), {
    hand: arrayUnion(...drawnCards),
  });

  return { cards: drawnCards };
};
```

### Test Pattern

```typescript
test("draw-to-match keeps drawing until match", async () => {
  const gameId = await createGame({ houseRules: ["drawToMatch"] });

  // Setup: Deck has Red 5, Blue 3, Red 7 (in order)
  // Top card is Green 4

  // Player draws
  const result = await drawCard(gameId, playerId);

  // Should draw 3 cards: Red 5 (no match), Blue 3 (no match), Red 7 (matches!)
  expect(result.cards.length).toBe(3);
  expect(result.cards[2]).toEqual(Red7);
});

test("draw-to-match doesn't apply to penalties", async () => {
  const gameId = await createGame({ houseRules: ["drawToMatch"] });

  // P1 plays Draw Two (sets mustDraw = 2)
  await playCard(gameId, p1, drawTwoIndex);

  // P2 draws (penalty draw, not voluntary)
  const result = await drawCard(gameId, p2);

  // Should draw EXACTLY 2 cards, not "until playable"
  expect(result.cards.length).toBe(2);
});
```

---

## Common Validation Patterns

### Pattern 1: Check if Rule is Enabled

```typescript
if (houseRules.includes("ruleName")) {
  // Rule-specific logic
}
```

### Pattern 2: Pass Rules to Validation

```typescript
// ALWAYS pass houseRules when validating
const playable = isCardPlayable(
  card,
  topCard,
  currentColor,
  mustDraw,
  houseRules // ← Don't forget this!
);
```

### Pattern 3: Rule Affects Playability

```typescript
if (houseRules.includes("ruleName")) {
  if (card.value === "7") {
    // With rule, 7s might be playable in different scenarios
    return true; // Custom logic
  }
}
```

### Pattern 4: Rule Affects Game State

```typescript
if (houseRules.includes("ruleName")) {
  if (triggerCondition) {
    // Mutate game state for rule effect
    t.update(gameRef(gameId), {
      "state.fieldName": newValue,
    });
  }
}
```

---

## Error Handling Patterns

### Graceful Degradation

```typescript
try {
  // Try to execute something
} catch (error) {
  // Handle gracefully without throwing
  // Continue turn instead of crashing game
  logger.warn("House rule operation failed", { error });
  // Proceed with standard behavior
}
```

### Validation Before Mutation

```typescript
// Always validate before mutating
if (!isPlayable) {
  throw new GameStateError(
    ErrorCode.INVALID_PLAY,
    `Card not playable with rules: ${houseRules}`,
    { cardIndex, houseRules }
  );
}

// Only then mutate
t.update(playerRef(gameId, playerId), { ... });
```

---

## Transaction Patterns

### Rule-Specific Transactions

```typescript
export const applyRuleEffect = async (
  gameId: string,
  playerId: string,
  t?: Transaction
): Promise<void> => {
  if (!t) {
    // No transaction provided, create one
    await db.runTransaction(async (transaction) => {
      await applyRuleEffect(gameId, playerId, transaction);
    });
    return;
  }

  // Inside transaction, use passed Transaction parameter
  const game = await getGame(gameId, t); // Use t for reads
  t.update(gameRef(gameId), { /* mutations */ }); // Use t for writes
};
```

### Combining Multiple Rules

```typescript
// If implementing Seven Swap + Jump-In together
export const jumpInWithSevenSwap = async (
  gameId: string,
  playerId: string,
  targetPlayerId: string,
  t?: Transaction
): Promise<void> => {
  const game = await getGame(gameId, t);

  // Check if both rules enabled
  if (!game.config.houseRules.includes("sevenSwap") ||
      !game.config.houseRules.includes("jumpIn")) {
    throw new Error("Rules not enabled");
  }

  // Revert first swap (if one happened)
  // Apply jump-in swap
  // In one atomic transaction
};
```

---

## Frontend UI Patterns

### Conditional Highlighting

```typescript
const getCardStyle = (card: Card): string => {
  const { houseRules } = game.config;

  if (isPlayable(card)) {
    return "playable"; // Default highlighting
  }

  // Rule-specific highlighting
  if (houseRules.includes("sevenSwap") && card.value === "7") {
    return "playable-seven-swap"; // Special highlight for 7s
  }

  if (houseRules.includes("zeroRotation") && card.value === "0") {
    return "playable-zero-rotation"; // Special highlight for 0s
  }

  return "not-playable";
};
```

### Conditional UI Elements

```typescript
{houseRules.includes("sevenSwap") && card.value === "7" && (
  <div className="rule-indicator">
    <Icon name="target" />
    <span>Select target player</span>
  </div>
)}
```

---

## Testing Checklist

When implementing a new rule:

- [ ] Unit tests written for rule disabled (standard behavior)
- [ ] Unit tests written for rule enabled (house rule behavior)
- [ ] Edge case tests written (deck exhaustion, multiple rules, etc.)
- [ ] Integration tests verify real game flow
- [ ] Frontend highlighting respects rule configuration
- [ ] All tests passing before merge
- [ ] Documentation updated in docs/HOUSE_RULES/

---

## Performance Considerations

### Avoid These Patterns

```typescript
// ❌ Don't loop through all cards multiple times
houseRules.forEach(rule => {
  cards.forEach(card => {
    isPlayable(card, rule);
  });
});

// ❌ Don't fetch entire game history to check rule
const history = await getAllGameEvents(gameId);

// ❌ Don't create new transaction for each rule
houseRules.forEach(rule => {
  db.runTransaction(...); // Creates new transaction each time!
});
```

### Preferred Patterns

```typescript
// ✅ Single pass through cards
const playableCards = cards.filter(card =>
  isCardPlayable(card, topCard, currentColor, mustDraw, houseRules)
);

// ✅ Check rule from game config (already loaded)
if (game.config.houseRules.includes("ruleName")) { ... }

// ✅ Single transaction handles all mutations
await db.runTransaction(async (t) => {
  // Do all reads and writes in one transaction
  const game = await getGame(gameId, t);
  // Apply all house rule effects
  t.update(gameRef(gameId), { ... });
});
```

---

## Summary

**Key Principles:**
1. Always pass `houseRules` to validation functions
2. Write tests before implementation
3. Handle both rule-disabled (standard) and rule-enabled (house rule) cases
4. Use transactions for atomic multi-card mutations
5. Gracefully handle edge cases (deck exhaustion, etc.)
6. Update frontend highlighting to respect rules

**Pattern to Follow:**
1. Define rule in types
2. Write tests
3. Update validation (`card-validation.ts`)
4. Update game logic (`game-service.ts`)
5. Update frontend (`game-board.tsx`)
6. Document everything
