# House Rules Testing Documentation

## Overview

This document describes the testing strategy and implementation status for all UNO house rules. House rules are optional gameplay variants that can be enabled when creating a game.

## House Rules Defined

The game supports five house rules as defined in `packages/shared/src/types.ts`:

```typescript
export const HouseRuleSchema = z.enum([
  "stacking",      // Stack Draw Two or Wild Draw Four cards
  "jumpIn",        // Play identical card out of turn
  "sevenSwap",     // Trade hands when playing a 7
  "drawToMatch",   // Keep drawing until playable card found
  "zeroRotation",  // Rotate all hands when 0 is played
]);
```

## Implementation Status

### ✅ Stacking (IMPLEMENTED & TESTED)

**Status:** Fully implemented and tested

**Behavior:**
- **Standard Rules (disabled):** When a Draw Two or Wild Draw Four is played, the next player MUST draw the specified number of cards. They cannot play another draw card to avoid drawing.
- **House Rule (enabled):** Players can play another Draw Two or Wild Draw Four to "stack" the penalty, passing it to the next player with an accumulated count.

**Implementation:**
- `packages/functions/src/service/card-validation.ts` - `isCardPlayable()` checks `houseRules.includes("stacking")`
- `packages/functions/src/service/game-service.ts` - Passes `game.config.houseRules` to validation
- `packages/web/src/components/game/game-board.tsx` - Frontend respects stacking rule for card highlighting

**Tests:**
- ✅ **Unit Tests** (`house-rules-unit.test.ts`): 46 tests covering all stacking scenarios
- ✅ **Integration Tests** (`house-rules.test.ts`): Tests with Firebase emulator
- ✅ **Validation Tests** (`card-validation.test.ts`): Core playability logic

**Key Test Coverage:**
- Blocking stacking when rule disabled
- Allowing stacking when rule enabled
- Draw Two + Draw Two stacking (2 + 2 = 4)
- Wild Draw Four + Wild Draw Four stacking (4 + 4 = 8)
- Cross-stacking (Draw Two on Wild Draw Four, vice versa)
- Multi-player stacking chains (2 + 2 + 2 + 4 = 10)
- Wild Draw Four legality check still enforced when NOT stacking
- Wild Draw Four legality check bypassed when stacking (mustDraw > 0)
- Non-draw cards still blocked during draw penalty
- Frontend card highlighting matches backend rules

### ⏳ Jump-In (NOT IMPLEMENTED)

**Status:** Defined but not implemented

**Expected Behavior:**
- Players can play an identical card (exact color and value match) out of turn
- Play resumes from the player who "jumped in"
- If jumping in with action cards (Skip, Reverse, Draw Two), the effect cancels the previous identical card

**Implementation Plan:**
- New Cloud Function: `jumpIn(gameId, playerId, cardIndex)`
- Validate exact card match against top of discard pile
- Update turn order to continue from jump-in player
- Handle action card cancellation logic

**Test Stubs:** Placeholder tests in `house-rules.test.ts` (lines 368-389)

### ⏳ Zero Rotation (NOT IMPLEMENTED)

**Status:** Defined but not implemented

**Expected Behavior:**
- When a "0" card is played, all hands rotate in the direction of play
- Clockwise direction: each player passes hand to next player
- Counter-clockwise: each player passes hand to previous player
- Player who played "0" continues their turn

**Implementation Plan:**
- Modify `playCard` to detect value === 0 with house rule enabled
- Transaction to atomically swap all player hands
- Update all player `cardCount` values

**Test Stubs:** Placeholder tests in `house-rules.test.ts` (lines 391-441)
**Working Test:** Line 392-422 verifies zero cards work normally WITHOUT the rule

### ⏳ Seven Swap (NOT IMPLEMENTED)

**Status:** Defined but not implemented

**Expected Behavior:**
- When a "7" card is played, the player must swap hands with another player of their choice
- The chosen player has no choice in the matter
- Both players' card counts update

**Implementation Plan:**
- Add optional `targetPlayerId` to `PlayCardRequest` schema
- Require target selection when playing 7 with house rule enabled
- Transaction to swap the two player hands
- UI to select target player

**Test Stubs:** Placeholder tests in `house-rules.test.ts` (lines 443-500)
**Working Test:** Line 444-485 verifies seven cards work normally WITHOUT the rule

### ⏳ Draw to Match (NOT IMPLEMENTED)

**Status:** Defined but not implemented

**Expected Behavior:**
- When drawing (because no playable card), continue drawing until a playable card is found
- Stop as soon as a playable card is drawn
- Can play the drawn card immediately
- Stop if deck is exhausted

**Implementation Plan:**
- Modify `drawCard` function to accept house rules
- Loop drawing cards until playable or deck empty
- Use `isCardPlayable` to check each drawn card

**Test Stubs:** Placeholder tests in `house-rules.test.ts` (lines 502-561)
**Working Test:** Line 503-533 verifies normal draw behavior WITHOUT the rule

## Test Files

### 1. `house-rules-unit.test.ts` (46 tests) ✅

**Purpose:** Unit tests for card validation logic with house rules

**Coverage:**
- `isDrawCard()` helper function (6 tests)
- Stacking validation with/without house rule (17 tests)
- Normal card playability (8 tests)
- Card effect application with stacking (9 tests)
- House rules edge cases (4 tests)
- Special card behavior (4 tests)
- Zero/Seven placeholder tests (4 tests)

**Run:** `bun test packages/functions/src/service/house-rules-unit.test.ts`

### 2. `house-rules.test.ts` (Integration tests)

**Purpose:** End-to-end tests with Firebase emulator

**Coverage:**
- Stacking house rule (6 tests, all for stacking)
- Jump-In placeholders (4 tests)
- Zero Rotation placeholders (4 tests)
- Seven Swap placeholders (4 tests)
- Draw to Match placeholders (5 tests)
- Multiple rules combined (3 tests)
- Edge cases (3 tests)

**Run:** Requires Firebase emulator on ports 8080, 9099, 5001
```bash
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

### 3. `card-validation.test.ts` (17 tests) ✅

**Purpose:** Core card validation logic

**Coverage:**
- Standard rules behavior (blocking all cards during draw penalty)
- Stacking house rule behavior (allowing draw cards)
- Color/value matching
- Wild card handling
- Turn advancement logic
- Card effect application

**Run:** `bun test packages/functions/src/service/card-validation.test.ts`

### 4. `game-actions.test.ts`

**Purpose:** Integration tests for game actions

**Coverage:**
- General play card functionality
- Stacking tests added (lines 202-291)
- Draw card behavior
- Pass turn mechanics
- Call UNO functionality

## Testing Best Practices

### When Adding a New House Rule

1. **Add unit tests first** in `house-rules-unit.test.ts`:
   - Test the rule disabled (standard behavior)
   - Test the rule enabled (house rule behavior)
   - Test edge cases and combinations

2. **Add integration tests** in `house-rules.test.ts`:
   - Create game with house rule enabled/disabled
   - Verify full transaction flow
   - Check Firestore state after actions

3. **Update validation logic**:
   - Modify `card-validation.ts` if card playability changes
   - Modify `game-service.ts` for game state mutations
   - Pass `houseRules` array to all validation functions

4. **Update frontend**:
   - Modify `game-board.tsx` card highlighting logic
   - Add UI for any required player input (e.g., target selection for Seven Swap)
   - Ensure `isPlayable()` function respects the house rule

5. **Document expected behavior**:
   - Add to `GAME_RULES.md` if needed
   - Update this file with implementation status
   - Add to `ROADMAP.md` if planning implementation

## Common Patterns

### Passing House Rules to Validation

Always pass the house rules array from game config:

```typescript
isCardPlayable(
  playedCard,
  topCard,
  currentColor,
  mustDraw,
  game.config.houseRules,  // ← Always pass this
)
```

### Checking if a Rule is Enabled

```typescript
if (game.config.houseRules.includes("stacking")) {
  // Stacking logic
}
```

### Frontend Card Highlighting

```typescript
const isPlayable = (card: UnoCard) => {
  if (game.state.mustDraw > 0) {
    if (game.config.houseRules.includes("stacking") && isDrawCard(card)) {
      return true;
    }
    return false;  // No cards playable during penalty
  }
  // ... normal matching logic
};
```

## Known Issues & Edge Cases

### ✅ Wild Draw Four Legality with Stacking

**Issue:** When stacking is enabled and `mustDraw > 0`, should the Wild Draw Four legality check still apply?

**Resolution:** The legality check (`mustDraw === 0 && activeColor`) correctly bypasses the check when stacking. This is intentional - during a stacking sequence, any Wild Draw Four can be played to continue the stack.

**Tests:** 
- Line 611-642 in `house-rules.test.ts`: Enforces legality when NOT stacking
- Line 644-683 in `house-rules.test.ts`: Bypasses legality when stacking

### ⚠️ Multiple House Rules Interaction

**Issue:** Some house rules may conflict or have undefined behavior when combined.

**Status:** Tests created for combinations (`house-rules.test.ts` lines 563-592) but implementation pending.

**Recommendation:** When implementing new house rules, test all combinations with existing rules.

## Running All Tests

```bash
# Unit tests (no emulator required)
bun test packages/functions/src/service/house-rules-unit.test.ts
bun test packages/functions/src/service/card-validation.test.ts

# Integration tests (requires Firebase emulator)
firebase emulators:start  # In separate terminal
bun test packages/functions/src/service/house-rules.test.ts
bun test packages/functions/src/service/game-actions.test.ts

# All backend tests
bun test packages/functions
```

## Future Work

1. **Implement Jump-In** (Phase 3 - ROADMAP.md)
   - New Cloud Function for out-of-turn play
   - Turn order insertion logic
   - Action card cancellation

2. **Implement Seven Swap** (Phase 3)
   - UI for target player selection
   - Hand swap transaction
   - Card count updates

3. **Implement Zero Rotation** (Phase 3)
   - Hand rotation logic
   - Direction-aware rotation
   - Atomic multi-player update

4. **Implement Draw to Match** (Phase 3)
   - Loop drawing logic
   - Deck exhaustion handling
   - Immediate play of drawn card

5. **Add E2E Tests**
   - Playwright tests for house rule UI
   - Test rule selection in create game form
   - Verify rule behavior in live gameplay

## Summary

- **Stacking:** ✅ Fully implemented and tested (46 unit tests, 6 integration tests)
- **Jump-In:** ⏳ Tests stubbed, awaiting implementation
- **Seven Swap:** ⏳ Tests stubbed, awaiting implementation  
- **Zero Rotation:** ⏳ Tests stubbed, awaiting implementation
- **Draw to Match:** ⏳ Tests stubbed, awaiting implementation

All test infrastructure is in place. As new house rules are implemented, remove the `expect(true).toBe(true)` placeholders and implement the actual test logic.
