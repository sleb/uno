# House Rules - Executive Summary

## Quick Overview

This project supports 5 optional house rules for UNO gameplay. Currently, **Stacking** is fully implemented and tested. The other 4 rules have complete test infrastructure ready for implementation.

## Implementation Status

| Rule              | Status          | Tests            | Conflicts                           |
| ----------------- | --------------- | ---------------- | ----------------------------------- |
| **Stacking**      | ✅ **COMPLETE** | 52 tests passing | None when used alone                |
| **Draw to Match** | ✅ **COMPLETE** | 9 tests passing  | 🟢 No conflicts                     |
| **Jump-In**       | ⏳ Pending      | Test stubs ready | 🟡 Complex with Stacking/Seven/Zero |
| **Seven Swap**    | ⏳ Pending      | Test stubs ready | 🟡 Complex with Jump-In             |
| **Zero Rotation** | ⏳ Pending      | Test stubs ready | 🟡 Complex with Jump-In             |

## What Each Rule Does

### ✅ Stacking (Implemented)

**Standard Rules:** When hit with Draw Two (+2) or Wild Draw Four (+4), you MUST draw that many cards.

**With Stacking:** You can play another Draw Two or Wild Draw Four to pass the penalty to the next player with accumulated count.

**Example:** P1 plays +4 → P2 plays +4 → P3 plays +2 → P4 must draw 10 cards (4+4+2).

### ⏳ Jump-In (Not Implemented)

Play an identical card (exact color AND value match) out of turn, even when it's not your turn.

**Example:** Red 5 is played → You have Red 5 → Play it immediately → Play continues from you.

**Special:** If jumping in with action cards (Skip, Reverse, Draw Two), the first card's effect cancels.

### ⏳ Seven Swap (Not Implemented)

When you play a 7, swap your entire hand with another player of your choice.

**Example:** You have 8 cards → Play Blue 7 → Swap with opponent who has 2 cards → You now have 2 cards.

### ⏳ Zero Rotation (Not Implemented)

When you play a 0, all players pass their hands to the next player in the direction of play.

**Example:** Clockwise game → Play Red 0 → Everyone passes hand to left → You continue your turn.

### ✅ Draw to Match (Implemented)

When drawing because you have no playable card, keep drawing until you get a playable card or the deck is exhausted.

**Standard Rules:** Draw 1 card, pass turn (even if unplayable).

**With Draw to Match:** Draw 1, 2, 3... cards until you get one you can play, then you may play it immediately.

**Important:** Only applies to voluntary draws, NOT penalty draws (Draw Two, Wild Draw Four).

## Visual Interaction Matrix

```
                    Stacking  Jump-In  Seven Swap  Zero Rotation  Draw to Match
Stacking               -        🟡         🟢            🟢              🟢
Jump-In               🟡        -          🟡            🟡              🟢
Seven Swap            🟢        🟡         -             🟢              🟢
Zero Rotation         🟢        🟡         🟢            -               🟢
Draw to Match         🟢        🟢         🟢            🟢              -

Legend:
🟢 = Fully Compatible (No conflicts)
🟡 = Medium Complexity (Design decisions needed)
🔴 = High Complexity (Avoid combining or implement carefully)
```

## Rule Interactions & Conflicts

### 🟢 Fully Compatible (No Conflicts)

- **Stacking + Seven Swap** - Different card types, work together fine
- **Stacking + Zero Rotation** - Different card types, work together fine
- **Stacking + Draw to Match** - Different game phases (playing vs drawing)
- **Seven Swap + Zero Rotation** - Both affect hands, but different triggers
- **Seven Swap + Draw to Match** - Different game phases
- **Zero Rotation + Draw to Match** - Different game phases

### 🟡 Medium Complexity (Design Decisions Needed)

- **Stacking + Jump-In**
  - Jump-In can interrupt stacking chains
  - Jump-In cancels the first identical card's effect
  - **Resolution:** Jump-In takes precedence (happens first)

- **Jump-In + Seven Swap**
  - Does jumping in with a 7 cancel the first player's swap?
  - **Recommendation:** YES - treat 7 as action card when Seven Swap enabled
  - Requires transaction rollback to undo first swap

- **Jump-In + Zero Rotation**
  - Does jumping in with a 0 cancel the first rotation?
  - **Recommendation:** YES - treat 0 as action card when Zero Rotation enabled
  - Requires reverting all player hands

### 🔴 High Complexity (Multiple Rules Together)

- **All 5 Rules Active**
  - Most complex: Stacking + Jump-In + Seven Swap + Zero Rotation
  - Requires careful transaction handling, rollback capability, and clear precedence rules
  - Draw to Match is independent and adds minimal complexity

## Recent Changes

### Draw to Match Implemented ✅

**What It Does:**

- When drawing voluntarily (no playable card in hand), keep drawing until you find a playable card
- Stops when playable card found OR deck exhausted
- Does NOT apply to penalty draws (still draw exact penalty amount)
- Safety limit of 50 cards prevents infinite loops

**Implementation:**

- Modified `drawCard()` in `game-service.ts`
- Loops drawing 1 card at a time, checking `isCardPlayable()` after each
- Only activates when `mustDraw === 0` and `houseRules.includes("drawToMatch")`
- Returns all drawn cards to player

**Tests:**

- 4 integration tests in `house-rules.test.ts`
- 5 unit tests in `house-rules-unit.test.ts`
- Verified: keeps drawing until match, stops at match, doesn't apply to penalties, allows playing drawn card

**Files Changed:**

- `packages/functions/src/service/game-service.ts` - Added Draw to Match logic
- `packages/functions/src/service/house-rules.test.ts` - Implemented tests
- `packages/functions/src/service/house-rules-unit.test.ts` - Added documentation tests
- `HOUSE_RULES_TESTING.md` - Updated implementation status

## Previous Changes

### Bug Fixed: Stacking Now Requires House Rule ✅

**Problem:** Wild Draw Four could always be stacked, even in standard games.

**Fixed:**

- Backend validation now checks `game.config.houseRules.includes("stacking")`
- Frontend card highlighting respects the rule
- Standard game: Must draw when hit with +2/+4
- Stacking enabled: Can play another draw card to pass penalty along

**Files Changed:**

- `packages/functions/src/service/card-validation.ts`
- `packages/functions/src/service/game-service.ts`
- `packages/web/src/components/game/game-board.tsx`

### Test Suite Created ✅

- **52 passing tests** for Stacking rule
- **Test stubs ready** for all other rules
- **Documentation complete** for all interactions

## Implementation Roadmap

### Recommended Order

1. ✅ **Stacking** - Complete
2. ✅ **Draw to Match** - Complete
3. ⏳ **Seven Swap** - Next (moderate complexity)
4. ⏳ **Zero Rotation** - Similar to Seven Swap
5. ⏳ **Jump-In** - Most complex, implement last

### Why This Order?

- **Stacking** and **Draw to Match** are complete (no conflicts, independent)
- **Seven Swap** and **Zero Rotation** have similar patterns (hand manipulation)
- **Jump-In** interacts with all others, so implement when others are stable

## Key Design Decisions

### Decision 1: Jump-In Effect Cancellation

**Question:** When Seven Swap or Zero Rotation is enabled, does Jump-In cancel their effects?

**Answer:** **YES**

- Treat 7 as action card when Seven Swap is enabled
- Treat 0 as action card when Zero Rotation is enabled
- Consistent with Jump-In's cancellation of Skip, Reverse, Draw Two

**Implementation:** Requires transaction rollback (save state before swap/rotation, revert if Jump-In occurs)

### Decision 2: Draw to Match with Penalties

**Question:** Does Draw to Match apply when drawing due to penalty (Draw Two, Wild Draw Four)?

**Answer:** **NO**

- Draw to Match only applies to voluntary draws
- Penalty draws are forced, not "because you have no playable card"
- Draw exact penalty amount, then turn passes

### Decision 3: Jump-In Matching

**Question:** What counts as "identical" for Jump-In?

**Answer:** **Exact color AND value match**

- Red 5 matches Red 5 only
- Wild cards cannot be jumped in (no color)
- Draw Two red matches Draw Two red, NOT Draw Two blue

## Files & Documentation

### Test Files

- `packages/functions/src/service/house-rules-unit.test.ts` - 51 unit tests ✅
- `packages/functions/src/service/house-rules.test.ts` - Integration tests (emulator required)
- `packages/functions/src/service/card-validation.test.ts` - 17 core tests ✅

### Documentation

- `HOUSE_RULES_TESTING.md` - Comprehensive testing guide
- `HOUSE_RULES_INTERACTIONS.md` - Detailed interaction analysis (this file)
- `HOUSE_RULES_CHANGES.md` - Summary of changes made

### Run Tests

```bash
# Unit tests (no emulator needed) - 68 tests
bun test packages/functions/src/service/house-rules-unit.test.ts  # 51 tests
bun test packages/functions/src/service/card-validation.test.ts   # 17 tests

# Integration tests (requires Firebase emulator)
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

## For Developers

### Adding a New House Rule

1. **Update test stubs** in `house-rules.test.ts`
2. **Add unit tests** in `house-rules-unit.test.ts`
3. **Implement backend logic:**
   - Modify `game-service.ts` (playCard/drawCard functions)
   - Update validation in `card-validation.ts` if needed
   - Pass `game.config.houseRules` to all validation functions
4. **Implement frontend:**
   - Update `game-board.tsx` card highlighting
   - Add UI for player input if needed (e.g., Seven Swap target selection)
5. **Test all combinations** with existing rules
6. **Update documentation** (this file + testing docs)

### Common Patterns

**Checking if rule is enabled:**

```typescript
if (game.config.houseRules.includes("stacking")) {
  // Rule-specific logic
}
```

**Frontend card playability:**

```typescript
const isPlayable = (card: UnoCard) => {
  if (game.state.mustDraw > 0) {
    if (game.config.houseRules.includes("stacking") && isDrawCard(card)) {
      return true;
    }
    return false;
  }
  // ... normal matching logic
};
```

## Summary

- **2 rules are production-ready:** Stacking (52 tests) and Draw to Match (9 tests)
- **3 rules pending implementation** with test infrastructure ready
- **All rules can coexist** with proper design decisions and implementation
- **Jump-In is most complex** due to interactions with other rules
- **Seven Swap or Zero Rotation next** - similar patterns (hand manipulation)

All design decisions are documented. Test infrastructure complete. Ready for Phase 3 continuation.
