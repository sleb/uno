# House Rules

Uno supports 5 optional house rules for customized gameplay. This directory contains all documentation about house rules, including what they do, how they interact, testing status, and implementation details.

## Quick Reference

| Rule | Status | Tests | Conflicts |
|------|--------|-------|-----------|
| **Stacking** | ✅ Complete | 52+ tests | None alone |
| **Draw to Match** | ✅ Complete | 9 tests | 🟢 Compatible |
| **Jump-In** | ⏳ Pending | Stubs | 🟡 Complex |
| **Seven Swap** | ⏳ Pending | Stubs | 🟡 Complex |
| **Zero Rotation** | ⏳ Pending | Stubs | 🟡 Complex |

## The Five House Rules

### ✅ Stacking (Fully Implemented)

When hit with a Draw Two (+2) or Wild Draw Four (+4) card, players can play another draw card to "stack" the penalty, passing it to the next player with an accumulated count.

**Example:** P1 plays +4 → P2 plays +4 → P3 plays +2 → P4 must draw 10 cards total.

### ✅ Draw to Match (Fully Implemented)

When drawing because you have no playable card, keep drawing cards one at a time until you find one you can play (or the deck is exhausted).

**Key:** Only applies to voluntary draws, not penalty draws (which draw exact amount).

### ⏳ Jump-In (Not Yet Implemented)

Play an identical card (exact color AND value match) out of turn to immediately interrupt play. Play resumes from you. If jumping with action cards (Skip, Reverse, Draw Two), the first card's effect cancels.

**Example:** Red 5 is played → You have Red 5 → Play it immediately → Play continues from you.

### ⏳ Seven Swap (Not Yet Implemented)

When you play a 7, swap your entire hand with another player of your choice. Strategic play to avoid approaching the win condition.

**Example:** You have 8 cards, opponent has 2 → Play 7 → Swap → You now have 2 cards.

### ⏳ Zero Rotation (Not Yet Implemented)

When you play a 0, all players pass their hands to the next player in the direction of play. Clockwise = pass left, Counter-clockwise = pass right.

**Example:** Clockwise game → Play Red 0 → Everyone passes hand to left in turn order.

## Documentation Structure

- **[INTERACTIONS.md](INTERACTIONS.md)** — Detailed pairwise analysis of how rules interact, conflict detection, and design decisions
- **[TESTING_STRATEGY.md](TESTING_STRATEGY.md)** — Test coverage, test file locations, how to run tests
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** — Recent changes, fixes, and implementation progress
- **[RULE_DETAILS.md](RULE_DETAILS.md)** — Implementation details for developers building rules

## Interaction Matrix

```
                    Stacking  Jump-In  Seven Swap  Zero Rotation  Draw to Match
Stacking               -        🟡         🟢            🟢              🟢
Jump-In               🟡        -          🟡            🟡              🟢
Seven Swap            🟢        🟡         -             🟢              🟢
Zero Rotation         🟢        🟡         🟢            -               🟢
Draw to Match         🟢        🟢         🟢            🟢              -

Legend: 🟢 = Compatible  |  🟡 = Medium Complexity  |  🔴 = High Complexity
```

## Key Design Decisions

### Jump-In Effect Cancellation
When Seven Swap or Zero Rotation is enabled, Jump-In cancels their effects. Treat 7 as action card when Seven Swap is enabled, and 0 as action card when Zero Rotation is enabled.

### Draw to Match with Penalties
Draw to Match **does not apply** to penalty draws (Draw Two, Wild Draw Four penalties draw exact amount). Only applies to voluntary draws when you have no playable card.

### Jump-In Matching
Jump-In requires exact color AND value match. Red 5 matches Red 5 only. Wild cards cannot be jumped in.

## Recommended Implementation Order

1. ✅ **Stacking** — Complete
2. ✅ **Draw to Match** — Complete
3. ⏳ **Seven Swap** — Moderate complexity, similar pattern to Zero Rotation
4. ⏳ **Zero Rotation** — Moderate complexity, similar pattern to Seven Swap
5. ⏳ **Jump-In** — Most complex, implement last (interacts with all others)

## Quick Start: Testing House Rules

```bash
# Run unit tests (no emulator needed)
bun test packages/functions/src/service/house-rules-unit.test.ts        # 51 tests
bun test packages/functions/src/service/card-validation.test.ts         # 17 tests

# Run integration tests (requires Firebase emulator)
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

## For Developers

See [RULE_DETAILS.md](RULE_DETAILS.md) for implementation patterns and examples.

See [INTERACTIONS.md](INTERACTIONS.md) for detailed behavior when combining rules.

## Files in Codebase

**Test files:**
- `packages/functions/src/service/house-rules-unit.test.ts` — Unit tests
- `packages/functions/src/service/house-rules.test.ts` — Integration tests
- `packages/functions/src/service/card-validation.test.ts` — Validation tests

**Implementation files:**
- `packages/functions/src/service/game-service.ts` — Game logic (playCard, drawCard)
- `packages/functions/src/service/card-validation.ts` — Card playability validation
- `packages/web/src/components/game/game-board.tsx` — Frontend card highlighting
