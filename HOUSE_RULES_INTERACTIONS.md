# House Rules Interactions Analysis

## Overview

This document analyzes how the five UNO house rules interact with each other, identifies potential conflicts, and provides implementation guidance for handling rule combinations.

## The Five House Rules

1. **Stacking** - Stack Draw Two or Wild Draw Four cards to accumulate penalties
2. **Jump-In** - Play identical card (color + value) out of turn
3. **Seven Swap** - Trade hands with chosen player when playing a 7
4. **Zero Rotation** - Rotate all hands in direction of play when playing a 0
5. **Draw to Match** - Keep drawing until a playable card is found

---

## Pairwise Interactions

### 🟡 Stacking + Jump-In (COMPLEX - Potential Conflict)

**Interaction:** This is the most complex combination with potential conflicts.

**Scenario 1: Jump-In interrupts stacking**
```
1. Player 1 plays Red Draw Two (penalty = +2)
2. Player 2 is about to draw
3. Player 3 has Red Draw Two and jumps in
```

**Per Jump-In rules:** "If you 'jump in' with a Draw Two, the second identical card played cancels out the first."

**Resolution:**
- Player 2 does NOT draw
- First Draw Two effect cancels
- Play continues from Player 3
- Player 3's Draw Two is now active for next player (penalty = +2)

**Scenario 2: Stacking prevents Jump-In?**
```
1. Player 1 plays Red Draw Two (penalty = +2)
2. Player 2 stacks with Blue Draw Two (penalty = +4)
3. Player 3 has Red Draw Two - can they jump in?
```

**Analysis:**
- Jump-In requires IDENTICAL card (same color AND value)
- Player 3's Red Draw Two matches Player 1's, not Player 2's Blue Draw Two
- The most recent card is Blue Draw Two, which Player 3 doesn't match

**Resolution:**
- Jump-In can only match the most recent card on discard pile
- Once someone stacks with a different color, Jump-In is blocked (no exact match)
- If Player 2 also played Red Draw Two, Player 3 could jump in and cancel

**Implementation Guidance:**
- Jump-In takes precedence over stacking (it's out of turn)
- Check for Jump-In attempts before processing turn-based stacking
- Jump-In cancels the most recent identical card's effect
- After Jump-In cancellation, play resumes from jump-in player

**Conflict Level:** 🟡 MEDIUM - Complex but resolvable with clear precedence rules

---

### 🟢 Stacking + Seven Swap (COMPATIBLE)

**Interaction:** These rules affect different card types and don't conflict.

**Scenario:**
```
1. Player 1 plays Draw Two (penalty = +2)
2. Player 2 has a 7 but no Draw Two
3. Player 2 must draw (cannot play 7 while penalty active)
```

**Analysis:**
- Stacking blocks ALL non-draw cards when `mustDraw > 0`
- Seven Swap only triggers when playing a 7
- A 7 cannot be played during a draw penalty (unless it's a house rule extension)

**Edge Case:**
```
1. Player 1 has 2 cards, plays 7, swaps with Player 2 who has 5 cards
2. Player 1 now has 5 cards (no longer close to winning)
```
- This is intended behavior - Seven Swap is a strategic choice

**Implementation Guidance:**
- No special handling needed
- Stacking rules apply to 7s like any other non-draw card
- Seven Swap triggers after 7 is successfully played

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Stacking + Zero Rotation (COMPATIBLE)

**Interaction:** Similar to Seven Swap - different card types, no conflict.

**Scenario:**
```
1. Player 1 plays Draw Two (penalty = +2)
2. Player 2 has a 0 but no Draw Two
3. Player 2 must draw (cannot play 0 while penalty active)
```

**Analysis:**
- Zero cannot be played during draw penalty
- Once played normally, Zero Rotation rotates all hands
- Compatible with stacking mechanics

**Edge Case:**
```
1. Player 1 plays Draw Two (penalty = +2)
2. Player 2 stacks with Draw Two (penalty = +4)
3. Player 3 plays 0, hands rotate, then must draw 4
```
- This works - 0 is a number card that can match by value
- If 0 matches and is played, hands rotate, then penalty still applies to next player

**Wait, there's an issue here!**
- If Player 3 plays a 0 (matching by value), is it a valid play?
- Per stacking rules: only draw cards are playable when `mustDraw > 0`
- A 0 is NOT a draw card, so it cannot be played

**Corrected Analysis:**
- 0 cannot be played when `mustDraw > 0` (stacking blocks it)
- No conflict - rules work together correctly

**Implementation Guidance:**
- Zero Rotation triggers only when 0 is successfully played
- Stacking rules prevent 0 from being played during penalties

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Stacking + Draw to Match (COMPATIBLE)

**Interaction:** These affect different phases of play.

**Scenario:**
```
1. Player 1 plays Wild Draw Four (penalty = +4)
2. Player 2 has no Wild Draw Four (cannot stack)
3. Player 2 draws 4 cards - does Draw to Match apply?
```

**Per Draw to Match rules:** "When you draw a card from the DRAW pile (because you have no playable card), you may continue drawing cards one at a time until you draw a card that matches..."

**Analysis:**
- Draw to Match applies to voluntary draws (when no playable card)
- Penalty draws are FORCED, not voluntary
- Draw to Match should NOT apply to penalty draws

**Implementation Guidance:**
- Draw to Match only applies when `mustDraw === 0`
- Penalty draws (`mustDraw > 0`) draw exact count, then turn passes
- Keep these mechanisms separate

**Conflict Level:** 🟢 NONE - Compatible with clear separation

---

### 🟡 Jump-In + Seven Swap (COMPLEX - Effect Cancellation)

**Interaction:** Jump-In rules for action cards create ambiguity.

**Scenario:**
```
1. Player 1 plays Blue 7, swaps hands with Player 3
2. Player 2 has Blue 7 and jumps in
```

**Per Jump-In rules:** "If you 'jump in' with a Skip, Reverse, Draw Two or Wild Draw Four, the second identical card played cancels out the first."

**Question:** Does this apply to 7s with Seven Swap house rule?

**Analysis:**
- Official Jump-In rules only mention: Skip, Reverse, Draw Two, Wild Draw Four
- 7 is a number card, not an action card
- Seven Swap is a HOUSE RULE, not a standard action card

**Option A: 7 is NOT an action card, Jump-In doesn't cancel**
- Player 1's swap stands
- Player 2 jumps in, also swaps hands with someone
- Two swaps occur

**Option B: With Seven Swap enabled, treat 7 as action card**
- Player 1's swap is CANCELLED (hands revert)
- Player 2's jump-in 7 swap proceeds
- Only one swap occurs

**Recommendation:** **Option B** - When Seven Swap is enabled, treat 7 as an action card for Jump-In purposes.

**Implementation Guidance:**
- If Seven Swap enabled AND Jump-In enabled:
  - Track the swap that occurred from first 7
  - If identical 7 is jumped in, revert the first swap
  - Apply the second swap
- Requires transaction rollback capability

**Conflict Level:** 🟡 MEDIUM - Requires design decision and careful implementation

---

### 🟡 Jump-In + Zero Rotation (COMPLEX - Effect Cancellation)

**Interaction:** Same issue as Seven Swap.

**Scenario:**
```
1. Player 1 plays Red 0, all hands rotate clockwise
2. Player 2 has Red 0 and jumps in
```

**Question:** Does Jump-In cancel the rotation?

**Analysis:**
- Same as Seven Swap - 0 is a number card, but has effect with house rule
- Official Jump-In only mentions standard action cards

**Option A: Rotation stands, second rotation occurs**
- Hands rotate twice (potentially returning to original positions)

**Option B: First rotation cancelled, second rotation occurs**
- Net effect: one rotation total

**Recommendation:** **Option B** - When Zero Rotation enabled, treat 0 as an action card for Jump-In purposes.

**Edge Case:**
```
1. 4 players (A, B, C, D), clockwise
2. Player A plays 0: hands rotate (A gets B's hand, B gets C's, etc.)
3. Player C has identical 0 and jumps in
4. First rotation CANCELLED - hands revert
5. Second rotation occurs
6. Net: hands still rotated, play continues from C
```

**Implementation Guidance:**
- Track hand states before rotation
- If Jump-In with identical 0, revert first rotation
- Apply second rotation
- Complex transaction logic required

**Conflict Level:** 🟡 MEDIUM - Requires design decision and transaction rollback

---

### 🟢 Jump-In + Draw to Match (COMPATIBLE)

**Interaction:** These affect different phases (playing vs drawing).

**Scenario:**
```
1. Player 1 plays Red 5
2. Player 2 draws using Draw to Match, draws 3 cards before finding Red 7
3. Before Player 2 plays Red 7, Player 3 jumps in with Red 5
```

**Analysis:**
- Jump-In can happen at any time (even during another player's turn)
- If Player 3 jumps in before Player 2 plays, Player 3 goes first
- Player 2 keeps their drawn cards but hasn't played yet

**Implementation Guidance:**
- Jump-In detection should be real-time or turn-based
- In asynchronous game, Jump-In must happen before next card is played
- No conflict in rules themselves

**Conflict Level:** 🟢 NONE - Compatible (implementation complexity in async game)

---

### 🟢 Seven Swap + Zero Rotation (COMPATIBLE)

**Interaction:** Different number cards, different effects.

**Scenario:**
```
1. Player 1 plays 7, swaps hands with Player 3
2. Player 2 plays 0, all hands rotate
```

**Analysis:**
- Playing 7 triggers swap (two players affected)
- Playing 0 triggers rotation (all players affected)
- Effects are independent and sequential

**Edge Case:**
```
1. Player A has 1 card (7)
2. Player B has 10 cards
3. Player A plays 7, swaps with Player B
4. Player A now has 10 cards
5. Next player plays 0, hands rotate
6. Complex state tracking required
```

**Implementation Guidance:**
- Apply effects in order: swap completes, then rotation
- Both effects modify hand states atomically in their respective transactions
- No conflict

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Seven Swap + Draw to Match (COMPATIBLE)

**Interaction:** Different game phases.

**Analysis:**
- Seven Swap: affects playing a 7
- Draw to Match: affects drawing cards
- No overlap or conflict

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Zero Rotation + Draw to Match (COMPATIBLE)

**Interaction:** Different game phases.

**Analysis:**
- Zero Rotation: affects playing a 0
- Draw to Match: affects drawing cards
- No overlap or conflict

**Conflict Level:** 🟢 NONE - Fully compatible

---

## Multi-Rule Combinations

### 🔴 Stacking + Jump-In + Seven Swap (HIGH COMPLEXITY)

**Scenario:**
```
1. Player 1 plays Red Draw Two (penalty = +2)
2. Player 2 plays Blue Draw Two (penalty = +4, stacking)
3. Player 3 plays Red 7, swaps with Player 1
4. Player 4 has Red Draw Two - Jump In?
```

**Conflicts:**
- Jump-In can match Player 1's original Red Draw Two (buried in stack)
- But Jump-In should match TOP card (Red 7)
- Jump-In requires exact match, Red Draw Two ≠ Red 7
- No jump-in possible

**Guidance:** Jump-In only matches the most recent (top) discard pile card.

---

### 🔴 All Rules Enabled (MAXIMUM COMPLEXITY)

When all 5 rules are enabled:
- **Stacking + Jump-In**: Complex precedence (Jump-In interrupts stacking)
- **Jump-In + Seven Swap/Zero Rotation**: Effect cancellation ambiguity
- **Draw to Match**: Separate from others, applies only to voluntary draws
- **Transaction complexity**: Multiple hand swaps/rotations may occur in sequence

**Recommendation:** 
- Document behavior clearly in UI when creating game
- Implement robust transaction rollback for Jump-In cancellations
- Test all combinations thoroughly

---

## Conflict Summary

| Combination | Conflict Level | Notes |
|-------------|---------------|-------|
| Stacking + Jump-In | 🟡 MEDIUM | Complex precedence, resolvable |
| Stacking + Seven Swap | 🟢 NONE | Fully compatible |
| Stacking + Zero Rotation | 🟢 NONE | Fully compatible |
| Stacking + Draw to Match | 🟢 NONE | Different phases |
| Jump-In + Seven Swap | 🟡 MEDIUM | Effect cancellation ambiguity |
| Jump-In + Zero Rotation | 🟡 MEDIUM | Effect cancellation ambiguity |
| Jump-In + Draw to Match | 🟢 NONE | Compatible (async complexity) |
| Seven Swap + Zero Rotation | 🟢 NONE | Fully compatible |
| Seven Swap + Draw to Match | 🟢 NONE | Different phases |
| Zero Rotation + Draw to Match | 🟢 NONE | Different phases |

---

## Implementation Recommendations

### Priority 1: Resolve Design Decisions

**Question 1:** When Seven Swap is enabled, does Jump-In with an identical 7 cancel the swap?
- **Recommendation:** YES - treat 7 as action card when Seven Swap is enabled
- **Rationale:** Consistent with Jump-In's action card cancellation mechanic

**Question 2:** When Zero Rotation is enabled, does Jump-In with an identical 0 cancel the rotation?
- **Recommendation:** YES - treat 0 as action card when Zero Rotation is enabled
- **Rationale:** Consistent with Seven Swap decision above

**Question 3:** Does Draw to Match apply to penalty draws?
- **Recommendation:** NO - only applies to voluntary draws
- **Rationale:** Penalty draws are forced, not "because you have no playable card"

### Priority 2: Implementation Order

1. **Stacking** ✅ - Already implemented and tested
2. **Draw to Match** - Simple, no conflicts
3. **Seven Swap** - Moderate complexity, prepare for Jump-In interaction
4. **Zero Rotation** - Similar to Seven Swap
5. **Jump-In** - Most complex, implement last when others are stable

### Priority 3: Transaction Handling

**Required Capabilities:**
- **Snapshot before effects**: Save game state before applying 7/0 effects
- **Rollback on Jump-In**: Revert hand swaps/rotations if cancelled
- **Atomic multi-player updates**: Swap/rotate hands in single transaction

**Example Flow:**
```
1. Player A plays Blue 7, swaps with Player B
   - Snapshot: A_hand_before, B_hand_before
   - Execute swap
   - Commit transaction
2. Player C jumps in with Blue 7 (before next player)
   - Detect Jump-In
   - Revert: A gets A_hand_before, B gets B_hand_before
   - Execute Player C's swap with chosen player
   - Commit transaction
```

### Priority 4: UI/UX Guidance

**Game Creation:**
- Show warning when enabling conflicting combinations
- Explain interaction behavior (e.g., "Jump-In can cancel Seven Swap")

**During Gameplay:**
- Clear indicators when effects are cancelled
- Animation showing hand reversions
- Confirmation prompts for complex actions

---

## Testing Strategy

### Test Combinations

| Rules Active | Tests Needed | Status |
|--------------|--------------|--------|
| None | Standard UNO rules | ✅ Complete |
| Stacking only | 46 unit + 6 integration | ✅ Complete |
| Stacking + Jump-In | Effect cancellation, precedence | ⏳ Pending |
| Stacking + Seven Swap | Blocked during penalty | ⏳ Pending |
| Jump-In + Seven Swap | Swap cancellation | ⏳ Pending |
| Jump-In + Zero Rotation | Rotation cancellation | ⏳ Pending |
| All 5 rules | Complex multi-effect scenarios | ⏳ Pending |

### Critical Test Scenarios

1. **Stacking interrupted by Jump-In**
   - Verify penalty doesn't apply to jumped player
   - Verify first card effect cancels
   - Verify play continues from jump-in player

2. **Seven Swap cancelled by Jump-In**
   - Verify hands revert to pre-swap state
   - Verify second swap applies correctly
   - Verify card counts update properly

3. **Zero Rotation cancelled by Jump-In**
   - Verify all hands revert to pre-rotation state
   - Verify second rotation applies correctly
   - Verify turn order preserved

4. **Draw to Match with penalty active**
   - Verify it does NOT apply (draw exact penalty amount)
   - Verify it DOES apply to voluntary draws

---

## Edge Cases

### Case 1: Self-Swap in Seven Swap
**Question:** Can a player swap with themselves?
**Recommendation:** NO - must choose different player

### Case 2: Two-Player Zero Rotation
**Question:** In 2-player game, rotation swaps hands - same as Seven Swap?
**Recommendation:** YES - this is allowed, rotation still applies

### Case 3: Jump-In During Hand Swap Animation
**Question:** In async game, what if Jump-In occurs during swap execution?
**Recommendation:** Queue Jump-In actions, process before next turn starts

### Case 4: Multiple Jump-Ins
**Question:** Can two players jump in simultaneously with identical cards?
**Recommendation:** First timestamp wins in async, closest player wins in sync

### Case 5: Jump-In with Wild Cards
**Question:** Can you jump in with Wild cards?
**Recommendation:** NO - Wild cards have no color, cannot be "identical"

---

## Summary

- **Most Compatible:** Seven Swap, Zero Rotation, Draw to Match (no conflicts with each other)
- **Most Complex:** Stacking + Jump-In (requires precedence rules)
- **Design Decisions Needed:** Jump-In cancellation for 7s and 0s with house rules
- **Implementation Order:** Stacking ✅ → Draw to Match → Seven Swap → Zero Rotation → Jump-In

**Overall Assessment:** All rules CAN coexist with proper implementation, but Jump-In interactions require careful design decisions and transaction rollback capabilities.
