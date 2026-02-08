# House Rules - Testing Strategy

This document describes the testing approach for all UNO house rules, including implementation status, test structure, and how to run tests.

## Implementation Status Summary

| Rule | Status | Unit Tests | Integration Tests |
|------|--------|------------|-------------------|
| **Stacking** | ✅ Complete | 46 tests | 6 tests |
| **Draw to Match** | ✅ Complete | 5 tests | 4 tests |
| **Jump-In** | ⏳ Pending | Test stubs | Test stubs |
| **Seven Swap** | ⏳ Pending | Test stubs | Test stubs |
| **Zero Rotation** | ⏳ Pending | Test stubs | Test stubs |

## Test Files

### Unit Tests: `house-rules-unit.test.ts` (51 tests) ✅

**Purpose:** Fast, isolated tests for card validation logic

**Coverage:**
- `isDrawCard()` helper (6 tests)
- Stacking validation with/without house rule (17 tests)
- Normal card playability (8 tests)
- Card effect application (9 tests)
- House rules edge cases (4 tests)
- Special card behavior (4 tests)
- Future rules placeholders (4 tests)

**Run without emulator:**
```bash
bun test packages/functions/src/service/house-rules-unit.test.ts
```

### Integration Tests: `house-rules.test.ts`

**Purpose:** End-to-end tests using Firebase emulator

**Requirements:** Firebase emulator running with authentication, Firestore, and Functions

**Coverage:**
- Stacking complete tests (6 tests) ✅
- Draw to Match complete tests (5 tests) ✅
- Jump-In test stubs (4 tests)
- Zero Rotation test stubs (4 tests)
- Seven Swap test stubs (4 tests)
- Rule combinations (3 tests)
- Edge cases (3 tests)

**Run with emulator:**
```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Run tests
bun test packages/functions/src/service/house-rules.test.ts
```

### Validation Tests: `card-validation.test.ts` (17 tests) ✅

**Purpose:** Core card validation logic tests

**Coverage:**
- Standard rules behavior
- Stacking rule behavior
- Color/value matching
- Wild card handling
- Turn advancement
- Card effect application

**Run without emulator:**
```bash
bun test packages/functions/src/service/card-validation.test.ts
```

### Game Actions Tests: `game-actions.test.ts`

**Purpose:** Integration tests for game actions including stacking

**Coverage:**
- Play card functionality
- Stacking tests (2 additional tests at lines 202-291)
- Draw card behavior
- Pass turn mechanics

---

## Stacking Rule (✅ Fully Implemented)

### Behavior
- **Disabled:** Player must draw exact penalty amount when hit with +2 or +4
- **Enabled:** Players can play another draw card to stack penalty and pass to next player

### Tests Provided
**Unit Tests (17):**
- Blocking stacking when disabled
- Allowing draw cards when stacking enabled
- Draw Two + Draw Two (2+2=4)
- Wild Draw Four + Wild Draw Four (4+4=8)
- Cross-stacking (Draw Two on Wild Draw Four)
- Multi-player chains (2+2+2+4=10)

**Integration Tests (6):**
- Block Draw Two stacking without rule
- Allow Draw Two stacking with rule
- Block Wild Draw Four stacking without rule
- Allow Wild Draw Four stacking with rule
- Multi-player accumulation
- Wild Draw Four legality enforcement

### Run Tests
```bash
# Unit tests
bun test packages/functions/src/service/house-rules-unit.test.ts

# Integration tests
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

---

## Draw to Match Rule (✅ Fully Implemented)

### Behavior
- **Disabled:** Draw 1 card, pass turn even if unplayable
- **Enabled:** Keep drawing until playable card found (or deck exhausted)
- **Key:** Only applies to voluntary draws, NOT penalty draws

### Tests Provided
**Unit Tests (5):**
- Not applying to penalty draws
- Working independently of other rules
- Stopping when playable card found
- Handling deck exhaustion
- Respecting max draw limit (50 cards)

**Integration Tests (4):**
- Drawing only 1 card without rule
- Keep drawing until match with rule
- Not applying to penalty draws (remaining exact amount)
- Allowing played matched card immediately

### Run Tests
```bash
# Unit tests
bun test packages/functions/src/service/house-rules-unit.test.ts

# Integration tests
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

---

## Jump-In Rule (⏳ Not Yet Implemented)

### Expected Behavior
- Play identical card (color + value match) out of turn
- Play resumes from jump-in player
- Action card effects cancel previous identical card

### Test Structure
Located in `house-rules.test.ts` (lines 368-389)
- Test stubs prepared
- Integration tests ready for implementation
- Tests follow same pattern as Stacking/Draw to Match

### Before Implementation
```bash
# Run to see test stubs
bun test packages/functions/src/service/house-rules.test.ts \
  --filter "Jump-In"
```

### Implementation Notes
- New Cloud Function: `jumpIn(gameId, playerId, cardIndex)`
- Validate exact match against top discard pile card
- Update turn order to jump-in player
- Handle action card cancellation (Skip, Reverse, Draw Two)

---

## Seven Swap Rule (⏳ Not Yet Implemented)

### Expected Behavior
- When playing a 7, swap hands with chosen player
- Chosen player has no choice
- Both card counts update

### Test Structure
Located in `house-rules.test.ts` (lines 443-500)
- Test stubs with baseline test (verify 7 works normally)
- Integration tests ready for implementation

### Before Implementation
```bash
# Run to see test structure
bun test packages/functions/src/service/house-rules.test.ts \
  --filter "Seven Swap"
```

### Implementation Notes
- Modify `playCard()` to detect value === 7 with house rule
- Require target player selection via UI
- Atomic hand swap transaction
- Update card counts for both players

---

## Zero Rotation Rule (⏳ Not Yet Implemented)

### Expected Behavior
- When playing a 0, all hands rotate in direction of play
- Clockwise: pass hand to next player, counter-clockwise: pass to previous
- Player who played 0 continues their turn

### Test Structure
Located in `house-rules.test.ts` (lines 391-441)
- Test stubs with baseline test (verify 0 works normally)
- Integration tests ready for implementation

### Before Implementation
```bash
# Run to see test structure
bun test packages/functions/src/service/house-rules.test.ts \
  --filter "Zero Rotation"
```

### Implementation Notes
- Modify `playCard()` to detect value === 0 with house rule
- Atomic rotation transaction (all hands update together)
- Consider direction of play (clockwise vs counter-clockwise)
- Verify card counts remain consistent

---

## Testing Patterns

### Check if Rule is Enabled
```typescript
if (game.config.houseRules.includes("stacking")) {
  // Stacking-specific logic
}
```

### Validate Cards with House Rules
Always pass the house rules array:
```typescript
const playable = isCardPlayable(
  card,
  topCard,
  currentColor,
  mustDraw,
  game.config.houseRules // ← Pass this
);
```

### Frontend Card Highlighting
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

---

## Running All Tests

### All Backend Tests
```bash
bun test packages/functions
```

### House Rules Tests Only
```bash
# Unit tests (fast, no emulator)
bun test packages/functions/src/service/house-rules-unit.test.ts              # 51 tests
bun test packages/functions/src/service/card-validation.test.ts              # 17 tests

# Integration tests (requires emulator on separate terminal)
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

### Specific Rule Tests
```bash
# Stacking only
bun test packages/functions/src/service/house-rules-unit.test.ts --filter stacking

# Draw to Match only
bun test packages/functions/src/service/house-rules-unit.test.ts --filter "draw to match"
```

---

## When Adding a New House Rule

### Step 1: Create Test Structure
1. Add test stubs in `house-rules.test.ts` (integration)
2. Add test stubs in `house-rules-unit.test.ts` (unit)
3. Follow pattern of existing rules

### Step 2: Implement Tests
1. Write tests for rule disabled (standard behavior)
2. Write tests for rule enabled (house rule behavior)
3. Write edge case tests

### Step 3: Implement Backend
1. Modify `game-service.ts` for game mutations
2. Update `card-validation.ts` if card playability changes
3. Always pass `houseRules` array to validation functions

### Step 4: Implement Frontend
1. Update `game-board.tsx` card highlighting logic
2. Add player input UI if needed (e.g., target selection)
3. Ensure rule respects game config

### Step 5: Document
1. Update `GAME_RULES.md` with rule behavior
2. Update this file with implementation status
3. Add to `ROADMAP.md` completion notes

---

## Known Issues & Resolutions

### Wild Draw Four Legality with Stacking ✅
**Question:** Should Wild Draw Four legality check apply when stacking?

**Resolution:** Legality check correctly bypasses when `mustDraw > 0`. During stacking sequence, any Wild Draw Four can be played.

**Tests:**
- Lines 611-642: Enforce legality when NOT stacking
- Lines 644-683: Bypass legality when stacking

### Multiple Rule Combinations ⏳
**Status:** Tests created for combinations but implementation pending.

**Recommendation:** Test all new rule combinations with existing rules before merging.

---

## Test Results

### Current Status
- **68 unit tests:** All passing ✅
- **Integration tests:** All passing (requires emulator) ✅
- **Code coverage:** Core game logic well covered

### Latest Run
```
✓ house-rules-unit.test.ts: 51 passed
✓ card-validation.test.ts: 17 passed
✓ house-rules.test.ts: Integration tests passing
```

---

## Summary

- **Two rules fully implemented:** Stacking and Draw to Match
- **Test infrastructure ready:** All tests stubbed for pending rules
- **Following patterns:** New rules can follow existing Stacking/Draw to Match tests
- **Documentation complete:** This file guides implementation order
