# Phase 2 Test Coverage Analysis

## Executive Summary

**Current Test Status:** 34 passing, 1 skipped, 0 failures  
**Coverage Assessment:** ⚠️ **Moderate** - Unit tests are solid, but **missing critical integration/e2e tests**

### Risk Areas:
1. ❌ **No end-to-end tests** for complete game flow with scoring
2. ❌ **No integration tests** for finalizeGame (test is skipped)
3. ❌ **No frontend tests** for new UI components
4. ⚠️ **Transaction logic** is not tested with real Firestore

---

## Current Test Coverage

### ✅ Well-Tested Areas (Unit Tests)

#### 1. **Score Calculation** (`score-utils.test.ts`) - 12 tests ✅
```typescript
✅ calculateCardScore
  - Number cards (0-9 points)
  - Special cards (20 points each)
  - Wild cards (50 points each)
  
✅ calculateHandScore
  - Empty hands
  - Mixed card types
  - All number cards
  - All special cards
  - All wild cards
  - Single card hands

✅ isSpecialCard
  - Number cards (not special)
  - Special action cards
  - Wild cards
```

**Confidence:** **HIGH** - Scoring logic is thoroughly tested with edge cases

---

#### 2. **Card Validation** (`card-validation.test.ts`) - 14 tests ✅
```typescript
✅ isCardPlayable
  - Draw penalty blocking
  - Draw card stacking
  - Wild card rules
  - Color/value matching
  - Current color after wild

✅ getNextPlayerId
  - Clockwise advancement
  - Counter-clockwise
  - Skip mechanics

✅ applyCardEffect
  - Draw penalties
  - Direction reversal
  - Skip marking
  - Wild Draw Four penalties
```

**Confidence:** **HIGH** - Card game mechanics well-covered

---

#### 3. **Deck Generation** (`game-service.test.ts`) - 3 tests ✅
```typescript
✅ generateCardAtIndex
  - Deterministic generation
  - Full 108-card deck
  - Official UNO histogram
```

**Confidence:** **HIGH** - Deck generation is solid

---

#### 4. **Stats Calculation Logic** (`finalize-game.test.ts`) - 5 tests ✅
```typescript
✅ Winner score calculation
✅ Ranking calculation
✅ Stats updates for winners
✅ Stats updates for losers
✅ First-time player initialization
```

**Confidence:** **MEDIUM-HIGH** - Logic is tested, but **not with real Firestore transactions**

---

## ❌ Missing Test Coverage

### Critical Gaps

#### 1. **Integration Tests for finalizeGame** ❌
```typescript
// Currently SKIPPED:
test.skip("calculates scores and updates stats when game completes")
```

**What's missing:**
- Real Firestore transaction testing
- Atomic updates verification
- Multi-player score calculation
- Stats persistence
- Error handling (transaction failures)

**Risk:** **HIGH** - This is the core Phase 2 functionality!

---

#### 2. **End-to-End Game Completion Flow** ❌

**Missing E2E scenarios:**
```
❌ Complete game from start to finish with scoring
   1. Create game
   2. Join with 2-4 players
   3. Start game
   4. Play cards until winner
   5. Verify finalScores created
   6. Verify all player stats updated
   7. Verify rankings correct

❌ Edge case: All players except winner have identical card counts
   - Verify ranking tie-breaking

❌ Edge case: Game completion with forfeited players
   - Do forfeited players get stats updated?

❌ Backward compatibility: Old completed games without finalScores
   - UI shouldn't crash

❌ Migration: Users without stats field
   - First game should initialize stats correctly
```

**Risk:** **HIGH** - These scenarios could break in production

---

#### 3. **Frontend Component Tests** ❌

**No tests for:**
```typescript
❌ CompletedGame component
   - Displays finalScores correctly
   - Shows confetti for winner
   - Handles missing finalScores (old games)
   - Rankings display correctly

❌ ProfileStats component
   - Displays all 8 stats correctly
   - Calculates win rate percentage
   - Formats large numbers with commas
   - Shows empty state for new users
   - Handles missing stats field

❌ Dashboard filtering
   - Completed games hidden by default
   - Toggle shows/hides completed games
   - Search works with filter
   - Empty states display correctly
```

**Risk:** **MEDIUM** - UI bugs are user-facing but less critical than data corruption

---

#### 4. **Transaction Atomicity** ❌

**No tests verifying:**
```typescript
❌ Transaction rollback on failure
   - If stats update fails, finalScores shouldn't be saved
   - Partial updates should not occur

❌ Race conditions
   - Multiple simultaneous game completions
   - Concurrent stat updates

❌ Error recovery
   - What happens if user document doesn't exist?
   - What happens if player hand fetch fails?
```

**Risk:** **HIGH** - Data consistency issues in production

---

## Recommended Test Additions

### Priority 1: Critical Integration Tests (MUST HAVE)

#### Test 1: Full Game Completion with Scoring
```typescript
describe("Game completion integration", () => {
  test("completes game and updates all player stats atomically", async () => {
    // Setup: Create game with 3 players
    // Each player has specific cards
    // Execute: Play final card to win
    // Verify:
    //   - Game status = "completed"
    //   - finalScores object created with correct scores
    //   - Winner stats: gamesWon++, totalScore += points
    //   - Loser stats: gamesLost++
    //   - All stats updated atomically (no partial updates)
  });
});
```

#### Test 2: Transaction Rollback on Failure
```typescript
test("rolls back transaction if any stat update fails", async () => {
  // Setup: Create game, delete one player's user document
  // Execute: Try to complete game
  // Verify:
  //   - Transaction fails
  //   - finalScores NOT saved
  //   - No partial stat updates
  //   - Error thrown with clear message
});
```

#### Test 3: Backward Compatibility
```typescript
test("handles existing users without stats field", async () => {
  // Setup: Create user without stats field (old user)
  // Execute: Complete game where this user wins
  // Verify:
  //   - Stats field created with correct initial values
  //   - gamesPlayed = 1, gamesWon = 1, winRate = 1.0
  //   - No errors thrown
});
```

---

### Priority 2: E2E Smoke Tests (SHOULD HAVE)

#### Test 4: Full Game Flow
```typescript
test("e2e: create → join → play → complete with scoring", async () => {
  // This would use actual emulator
  // Full flow from game creation to completion
  // Verify UI shows correct finalScores and stats
});
```

---

### Priority 3: Frontend Component Tests (NICE TO HAVE)

#### Test 5: CompletedGame Component
```typescript
test("displays final scores and rankings", () => {
  // Render with finalScores
  // Verify table shows correct rankings
  // Verify winner highlighted
  // Verify scores displayed correctly
});

test("handles missing finalScores gracefully", () => {
  // Render with old completed game (no finalScores)
  // Verify fallback UI displays
  // Verify no errors thrown
});
```

#### Test 6: ProfileStats Component
```typescript
test("displays all stats correctly", () => {
  // Render with mock user stats
  // Verify all 8 metrics displayed
  // Verify win rate formatted as percentage
  // Verify large numbers formatted with commas
});

test("shows empty state for new users", () => {
  // Render with user without stats
  // Verify "No games played yet" message
  // Verify all stats show 0
});
```

---

## Implementation Plan

### Minimal E2E Test Suite (For Immediate Deployment)

```typescript
// packages/functions/src/service/finalize-game.integration.test.ts

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

describe("finalizeGame integration tests", () => {
  let app, db;
  
  beforeEach(() => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    app = initializeApp({ projectId: "test-project" }, `test-${Date.now()}`);
    db = getFirestore(app);
  });
  
  afterEach(async () => {
    await app.delete();
  });

  test("completes 2-player game with correct scoring", async () => {
    // Create test users
    await db.collection("users").doc("player1").set({
      displayName: "Alice",
      avatar: "🏆",
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalScore: 0,
        highestGameScore: 0,
        winRate: 0,
        cardsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });
    
    await db.collection("users").doc("player2").set({
      displayName: "Bob",
      avatar: "🎮",
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalScore: 0,
        highestGameScore: 0,
        winRate: 0,
        cardsPlayed: 0,
        specialCardsPlayed: 0,
      },
    });

    // Create game
    const gameRef = db.collection("games").doc("test-game");
    await gameRef.set({
      /* game data */
      state: { status: "in-progress" },
      players: ["player1", "player2"],
    });

    // Create player hands
    await gameRef.collection("playerHands").doc("player1").set({
      hand: [], // Winner - no cards
    });
    
    await gameRef.collection("playerHands").doc("player2").set({
      hand: [
        { kind: "number", color: "red", value: 5 },     // 5 pts
        { kind: "special", color: "blue", value: "skip" }, // 20 pts
        { kind: "wild", value: "wild" },               // 50 pts
      ], // Total: 75 points
    });

    // Create player data
    await gameRef.collection("players").doc("player1").set({
      userId: "player1",
      cardCount: 0,
      status: "active",
      gameStats: { cardsPlayed: 10, specialCardsPlayed: 3 },
    });
    
    await gameRef.collection("players").doc("player2").set({
      userId: "player2",
      cardCount: 3,
      status: "active",
      gameStats: { cardsPlayed: 8, specialCardsPlayed: 2 },
    });

    // Execute: Finalize game
    await db.runTransaction(async (t) => {
      await finalizeGame("test-game", "player1", t);
    });

    // Verify: Game has finalScores
    const game = await gameRef.get();
    const gameData = game.data();
    
    expect(gameData.state.status).toBe("completed");
    expect(gameData.finalScores).toBeDefined();
    expect(gameData.finalScores.winnerId).toBe("player1");
    expect(gameData.finalScores.winnerScore).toBe(75);
    expect(gameData.finalScores.playerScores).toHaveLength(2);
    
    // Verify: Rankings
    const rankings = gameData.finalScores.playerScores;
    expect(rankings[0].playerId).toBe("player1");
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].playerId).toBe("player2");
    expect(rankings[1].rank).toBe(2);

    // Verify: Winner stats updated
    const winner = await db.collection("users").doc("player1").get();
    const winnerStats = winner.data().stats;
    
    expect(winnerStats.gamesPlayed).toBe(1);
    expect(winnerStats.gamesWon).toBe(1);
    expect(winnerStats.gamesLost).toBe(0);
    expect(winnerStats.totalScore).toBe(75);
    expect(winnerStats.highestGameScore).toBe(75);
    expect(winnerStats.winRate).toBe(1.0);
    expect(winnerStats.cardsPlayed).toBe(10);
    expect(winnerStats.specialCardsPlayed).toBe(3);

    // Verify: Loser stats updated
    const loser = await db.collection("users").doc("player2").get();
    const loserStats = loser.data().stats;
    
    expect(loserStats.gamesPlayed).toBe(1);
    expect(loserStats.gamesWon).toBe(0);
    expect(loserStats.gamesLost).toBe(1);
    expect(loserStats.totalScore).toBe(0); // Losers don't gain score
    expect(loserStats.winRate).toBe(0.0);
    expect(loserStats.cardsPlayed).toBe(8);
    expect(loserStats.specialCardsPlayed).toBe(2);
  });

  test("handles user without existing stats", async () => {
    // Create user WITHOUT stats field (old user)
    await db.collection("users").doc("player1").set({
      displayName: "Alice",
      avatar: "🏆",
      // NO stats field
    });

    // ... rest of test setup similar to above ...

    // Execute: Finalize game
    await db.runTransaction(async (t) => {
      await finalizeGame("test-game", "player1", t);
    });

    // Verify: Stats created correctly
    const winner = await db.collection("users").doc("player1").get();
    const stats = winner.data().stats;
    
    expect(stats).toBeDefined();
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    // ... etc
  });
});
```

---

## Test Execution Strategy

### Before Merging to Main:
```bash
# 1. Ensure emulators are running
firebase emulators:start

# 2. Run all tests
bun test

# 3. Run integration tests specifically
bun test finalize-game.integration.test.ts

# 4. Manual E2E test (with seed data)
bun scripts/seed-test-data.ts
# Then play a game to completion in browser
# Verify finalScores and stats in Firestore UI
```

### CI/CD Pipeline:
```yaml
- name: Run unit tests
  run: bun test

- name: Start emulators
  run: firebase emulators:exec --project demo-test "bun test"
  
- name: E2E smoke test
  run: # Run Playwright/Cypress test
```

---

## Confidence Assessment

### Overall Confidence for Production: **MEDIUM** ⚠️

| Component | Unit Tests | Integration Tests | E2E Tests | Confidence |
|-----------|-----------|------------------|-----------|------------|
| Score calculation | ✅ Excellent | N/A | N/A | **HIGH** ✅ |
| Card validation | ✅ Excellent | N/A | ✅ Manual | **HIGH** ✅ |
| Deck generation | ✅ Good | N/A | ✅ Manual | **HIGH** ✅ |
| finalizeGame logic | ✅ Good | ❌ **Missing** | ❌ **Missing** | **MEDIUM** ⚠️ |
| Transaction atomicity | ❌ None | ❌ **Missing** | ❌ **Missing** | **LOW** ⚠️ |
| Stats updates | ✅ Logic tested | ❌ **Missing** | ❌ **Missing** | **MEDIUM** ⚠️ |
| Frontend components | ❌ None | ❌ None | ✅ Manual | **LOW-MEDIUM** ⚠️ |
| Backward compatibility | ❌ None | ❌ **Missing** | ❌ **Missing** | **LOW** ⚠️ |

---

## Recommendations

### For Immediate Deployment (Minimum Viable Testing):

1. ✅ **Keep existing unit tests** (34 tests) - These are solid
2. ⚠️ **Add ONE integration test** for finalizeGame (2-player scenario)
3. ⚠️ **Manual E2E test** with seed data before deploying
4. 📋 **Document known test gaps** in deployment notes

### For Production-Ready Quality:

1. ✅ Implement full integration test suite (3-5 tests)
2. ✅ Add frontend component tests (Vitest + React Testing Library)
3. ✅ Add E2E smoke test (Playwright)
4. ✅ Test transaction rollback scenarios
5. ✅ Test backward compatibility explicitly

---

## Conclusion

**Current state:** The **business logic is well-tested** (scoring, card validation), but **critical integration points are untested** (transactions, stats updates, game completion flow).

**Recommendation:** Add **minimal integration tests** before deploying to production. The integration test template above would cover 80% of the risk with 20% of the effort.

**Timeline:**
- Minimal tests: 1-2 hours
- Full test suite: 1-2 days

---

**Last Updated:** 2026-02-02
