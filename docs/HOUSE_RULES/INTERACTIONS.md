# House Rules - Interactions Analysis

This document analyzes how the five UNO house rules interact with each other, identifies potential conflicts, and provides implementation guidance for handling rule combinations.

## Pairwise Interactions

### 🟡 Stacking + Jump-In (COMPLEX - Potential Conflict)

**Interaction:** This is the most complex combination with potential conflicts.

**Scenario 1: Jump-In interrupts stacking**
```
1. Player 1 plays Red Draw Two (penalty = +2)
2. Player 2 is about to draw
3. Player 3 has Red Draw Two and jumps in
```

**Per Jump-In rules:** If you 'jump in' with a Draw Two, the second identical card played cancels out the first.

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

**Analysis:**
- Stacking blocks ALL non-draw cards when `mustDraw > 0`
- Seven Swap only triggers when playing a 7
- A 7 cannot be played during a draw penalty

**Implementation Guidance:**
- No special handling needed
- Stacking rules apply to 7s like any other non-draw card
- Seven Swap triggers after 7 is successfully played

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Stacking + Zero Rotation (COMPATIBLE)

**Interaction:** Similar to Seven Swap - different card types, no conflict.

**Analysis:**
- Zero cannot be played during draw penalty
- Once played normally, Zero Rotation rotates all hands
- Compatible with stacking mechanics
- 0 is NOT a draw card, so cannot be played when `mustDraw > 0`

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Stacking + Draw to Match (COMPATIBLE)

**Interaction:** These affect different phases of play.

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

**Question:** Does this apply to 7s with Seven Swap house rule?

**Analysis:**
- Official Jump-In rules mention: Skip, Reverse, Draw Two, Wild Draw Four
- 7 is a number card, not a standard action card
- Seven Swap is a HOUSE RULE, not a standard action card

**Recommendation:** **YES** - When Seven Swap is enabled, treat 7 as an action card for Jump-In purposes.

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

**Recommendation:** **YES** - When Zero Rotation enabled, treat 0 as an action card for Jump-In purposes.

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

**Analysis:**
- Jump-In happens at any time (even during another player's turn)
- Draw to Match applies only during drawing phase
- No overlap or conflict in rules

**Conflict Level:** 🟢 NONE - Compatible (implementation complexity in async game)

---

### 🟢 Seven Swap + Zero Rotation (COMPATIBLE)

**Interaction:** Different number cards, different effects.

**Analysis:**
- Playing 7 triggers swap (two players affected)
- Playing 0 triggers rotation (all players affected)
- Effects are independent and sequential
- No conflict

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Seven Swap + Draw to Match (COMPATIBLE)

**Interaction:** Different game phases.

**Conflict Level:** 🟢 NONE - Fully compatible

---

### 🟢 Zero Rotation + Draw to Match (COMPATIBLE)

**Interaction:** Different game phases.

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

**Guidance:** Jump-In only matches the most recent (top) discard pile card. In this case, the top card is Red 7, not Draw Two.

---

### 🔴 All Rules Enabled (MAXIMUM COMPLEXITY)

When all 5 rules are enabled:
- **Stacking + Jump-In**: Complex precedence (Jump-In interrupts stacking)
- **Jump-In + Seven Swap/Zero Rotation**: Effect cancellation ambiguity
- **Draw to Match**: Separate from others, applies only to voluntary draws
- **Transaction complexity**: Multiple hand swaps/rotations may occur in sequence

**Implementation considerations:** Robust transaction rollback for Jump-In cancellations.

---

## Conflict Summary Table

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

## Edge Cases

### Can a player swap with themselves in Seven Swap?
**Recommendation:** NO - must choose different player

### In 2-player game, Zero Rotation swaps hands - same as Seven Swap?
**Recommendation:** YES - this is allowed, rotation still applies

### Can you jump in with Wild cards?
**Recommendation:** NO - Wild cards have no color, cannot be "identical"

### Multiple Jump-Ins with identical cards?
**Recommendation:** First timestamp wins in async games, closest player wins in sync games

---

## Key Design Decisions

### Jump-In Effect Cancellation ✅

**Decision:** When Seven Swap or Zero Rotation is enabled, Jump-In cancels their effects.

- Treat 7 as action card when Seven Swap is enabled
- Treat 0 as action card when Zero Rotation is enabled
- Consistent with Jump-In's cancellation of Skip, Reverse, Draw Two

**Implementation:** Requires transaction rollback (save state before swap/rotation, revert if Jump-In occurs)

### Draw to Match with Penalties ✅

**Decision:** Draw to Match does NOT apply to penalty draws.

- Draw to Match only applies when `mustDraw === 0`
- Penalty draws (`mustDraw > 0`) draw exact count, then turn passes
- Keep these mechanisms separate

**Rationale:** Penalty draws are forced, not "because you have no playable card"

### Jump-In Matching ✅

**Decision:** Exact color AND value match required.

- Red 5 matches Red 5 only
- Wild cards cannot be jumped in (no color)
- Draw Two red matches Draw Two red, NOT Draw Two blue

---

## Recommended Implementation Order

1. ✅ **Stacking** — Already implemented
2. **Draw to Match** — Simple, no conflicts
3. **Seven Swap** — Moderate complexity, prepare for Jump-In interaction
4. **Zero Rotation** — Similar to Seven Swap
5. **Jump-In** — Most complex, implement last when others are stable

---

## Summary

- **Most Compatible:** Seven Swap, Zero Rotation, Draw to Match (no conflicts with each other)
- **Most Complex:** Stacking + Jump-In (requires precedence rules)
- **Design Decisions Needed:** Jump-In cancellation for 7s and 0s with house rules
- **Overall Assessment:** All rules CAN coexist with proper implementation, but Jump-In interactions require careful design decisions and transaction rollback capabilities.
