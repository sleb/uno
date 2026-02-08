# Gameplay Improvement: Auto-Pass After Unplayable Draw

## Issue
When a player draws a card that is not playable, the game was requiring them to manually click "Pass Turn" to advance to the next player. This was unintuitive and unnecessary - if a drawn card cannot be played, the turn should automatically advance.

## Solution
Updated the draw action logic to automatically determine if the turn should advance based on card playability:

### Changes Made

#### Backend: `draw-action-apply-rule.ts`
- **What Changed:** Added logic to check if drawn cards are playable after a normal (non-penalty) draw
- **Behavior:**
  - **Penalty Draw** (e.g., "Draw Two" with mustDraw > 0): Turn always advances automatically to next player
  - **Draw-to-Match** (house rule enabled): Turn stays with player (they have a playable card by rules)
  - **Normal Draw** (standard play):
    - If at least one drawn card is playable → Turn stays with current player (can play it or pass)
    - If no drawn cards are playable → Turn automatically advances to next player (no "Pass" button needed)

#### Test Coverage

**Unit Tests** (`draw-action-apply-rule.test.ts`):
- Tests confirm auto-advance logic respects the three draw scenarios
- Verifies penalty draws always advance
- Verifies normal draws conditionally advance based on card playability

**Integration Tests** (`game-actions.test.ts`):
- Added test `"should auto-advance turn after drawing unplayable card (no manual pass needed)"`
- Documents the expected behavior with realistic game state setup

### UI Impact
The frontend UI automatically benefits from this change:
- When turn auto-advances, `game.state.currentTurnPlayerId` updates to next player
- Current player's `isMyTurn` becomes false
- UI automatically transitions from play/pass options to "Waiting for your turn to play"
- No UI changes needed - the game state mutation handles the user experience

### Player Experience

**Before:**
1. Player draws a card
2. Card is not playable
3. UI waits for player to click "Pass Turn"
4. Turn advances to next player

**After:**
1. Player draws a card
2. If playable: UI lets player play it or pass ✓
3. If not playable: Turn automatically advances, UI switches to "Waiting..." state ✓

### Testing Instructions

Run unit tests:
```bash
bun test packages/functions/src/service/rules/draw-action-apply-rule.test.ts
```

Run integration tests (requires emulator):
```bash
firebase emulators:start &
bun test packages/functions/src/service/game-actions.test.ts
```

### Technical Notes
- Logic respects house rules (draw-to-match, stacking) in card playability checks
- Uses existing `isCardPlayable()` function for consistency with play validation
- Maintains backward compatibility with penalty draw flow
- Draw pile count and stats tracking unchanged
