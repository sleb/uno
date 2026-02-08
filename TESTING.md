# Testing

Uno has comprehensive test coverage across unit tests, integration tests, and end-to-end tests using Bun's built-in test runner.

## Quick Start

```bash
# Run unit tests (no Firebase emulator needed)
bun test

# Run specific test file
bun test packages/functions/src/service/game-service.test.ts

# Run in watch mode
bun test --watch

# Run integration tests (requires Firebase emulator)
firebase emulators:start  # Terminal 1
bun test packages/functions  # Terminal 2
```

## Test Types

### Unit Tests ✅
Fast, isolated tests for individual functions and modules. These don't require the Firebase emulator.

**Files:**
- `packages/functions/src/service/house-rules-unit.test.ts` (51 tests)
- `packages/functions/src/service/card-validation.test.ts` (17 tests)
- `packages/functions/src/service/draw-play-workflow.test.ts`
- All other `*.test.ts` files in `packages/functions/src/service/`

**Run:**
```bash
bun test packages/functions/src/service
```

### Integration Tests ✅
Full end-to-end tests using the Cloud Functions emulator and Firestore emulator.

**Files:**
- `packages/functions/src/service/house-rules.test.ts` — House rules with real game flow
- `packages/functions/src/service/game-service.test.ts` — Game state management
- `packages/functions/src/service/game-actions.test.ts` — Play card, draw card, etc.
- `packages/web/e2e/*.spec.ts` — (See E2E Tests)

**Requirements:**
- Firebase emulator running on local ports (9099 auth, 8080 firestore, 5001 functions)
- Bun test runner configured to connect to emulator

**Run:**
```bash
# Terminal 1
firebase emulators:start

# Terminal 2
bun test packages/functions/src/service
```

### End-to-End Tests ✅
Full gameplay testing with browser automation using Playwright.

**Files:**
- `packages/web/e2e/auth-flow.spec.ts` — Login/signup flow
- `packages/web/e2e/game-creation.spec.ts` — Creating and joining games
- `packages/web/e2e/two-player-gameplay.spec.ts` — Complete game flow
- `packages/web/e2e/profile-stats.spec.ts` — Profile and statistics

**Requirements:**
- Firebase emulator running
- Web server running (`bun dev` or `bun start`)
- Playwright browsers installed

**Run:**
```bash
# Terminal 1
firebase emulators:start

# Terminal 2
cd packages/web && bun dev

# Terminal 3
bun exec playwright test packages/web/e2e
```

---

## House Rules Testing

House rules have comprehensive test coverage. See [docs/HOUSE_RULES/TESTING_STRATEGY.md](docs/HOUSE_RULES/TESTING_STRATEGY.md) for detailed information.

### Stacking Rule ✅
- **46 unit tests** for card validation with/without rule
- **6 integration tests** for real game flow
- Tests verify penalty stacking, multi-player chains, cross-card stacking

### Draw to Match Rule ✅
- **5 unit tests** for draw logic
- **4 integration tests** for real game flow
- Tests verify drawing stops at playable card, doesn't apply to penalties

### Other House Rules (Pending)
- Jump-In, Seven Swap, Zero Rotation — test stubs ready, implementation pending

---

## Testing Best Practices

### Unit Tests
```bash
# Fast feedback loop
bun test --watch packages/functions/src/service/card-validation.test.ts
```

Use unit tests for:
- Card validation logic
- Game state calculations
- Error code matching
- Utility functions

### Integration Tests
```bash
# Requires emulator, takes longer but tests complete flow
firebase emulators:start
bun test packages/functions/src/service/house-rules.test.ts
```

Use integration tests for:
- Multi-function workflows
- Firebase transaction integrity
- Real game state mutations
- Error handling in transactions

### E2E Tests
```bash
# Before running E2E tests, ensure:
# 1. Firebase emulator is running
# 2. Web dev server is running
# 3. Browsers are installed: npx playwright install
```

Use E2E tests for:
- User workflows (login, create game, play)
- UI state synchronization
- Real browser interactions
- Audio/animation (if tested)

---

## Test Structure

### Unit Test File Template
```typescript
describe("Card Validation", () => {
  test("should validate color match", () => {
    const card = { color: "RED", value: "5" };
    const topCard = { color: "RED", value: "7" };

    expect(isCardPlayable(card, topCard)).toBe(true);
  });

  test("should reject mismatched color and value", () => {
    const card = { color: "RED", value: "5" };
    const topCard = { color: "BLUE", value: "7" };

    expect(isCardPlayable(card, topCard)).toBe(false);
  });
});
```

### Integration Test File Template
```typescript
describe("Play Card Game Flow", () => {
  beforeAll(setupFirebaseEmulator);
  afterAll(cleanupFirebaseEmulator);

  test("should play valid card and update game state", async () => {
    const gameId = await createGame({ houseRules: [] });
    const playerId = "test-player-1";

    await playCard(gameId, playerId, 0); // Play card at index 0

    const game = await getGame(gameId);
    expect(game.state.discardPile.length).toBeGreaterThan(0);
  });
});
```

---

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test File
```bash
bun test packages/functions/src/service/card-validation.test.ts
```

### Run Tests Matching Pattern
```bash
bun test --filter stacking  # Run tests with "stacking" in name
bun test --filter "house rules"
```

### Run with Coverage
```bash
bun test --coverage
```

### Watch Mode
```bash
bun test --watch  # Re-run on file changes
```

---

## CI/CD Integration

Tests run automatically on:
- Pull requests (GitHub Actions)
- Merges to main branch
- Before deployment to Firebase

**Current Test Status:** All tests passing ✅

---

## Debugging Failed Tests

### Unit Test Failures
```typescript
// Add logging to understand test failure
test("should do something", () => {
  const result = someFunction();
  console.log("Debug:", result);  // ← Visible in test output
  expect(result).toBe(expected);
});
```

### Integration Test Failures
```bash
# Check Firebase emulator logs
firebase emulators:start  # Look for emulator console output

# Verify Firestore state
firebase emulators:start
# Open http://localhost:4000 to inspect emulator
```

### E2E Test Failures
```bash
# Run with headed browser (see what the browser is doing)
bun exec playwright test --headed packages/web/e2e/auth-flow.spec.ts

# Generate trace for debugging
bun exec playwright test --trace on packages/web/e2e

# View trace: npx playwright show-trace trace.zip
```

---

## Documentation

- [INTEGRATION_TESTS.md](INTEGRATION_TESTS.md) — Detailed integration testing guide
- [E2E_TESTS.md](E2E_TESTS.md) — Playwright e2e testing guide
- [docs/HOUSE_RULES/TESTING_STRATEGY.md](docs/HOUSE_RULES/TESTING_STRATEGY.md) — House rules test structure and status

---

## Test Coverage Goals

| Area | Target | Status |
|------|--------|--------|
| Card validation | 100% | ✅ Complete (house-rules-unit.test.ts) |
| Game service | 95% | ✅ Near complete |
| Cloud Functions | 90% | ✅ Good coverage |
| Frontend components | 80% | ⏳ Partial (E2E covers main flows) |
| House rules | 100% | ✅ Complete for Stacking & Draw to Match |

---

## Common Test Issues

### Firebase Emulator Connection Timeout
```
Symptom: Test hangs or fails with "Could not connect to Firebase emulator"
Solution:
1. Ensure firebase emulators:start is running
2. Verify ports 8080, 9099, 5001 are not in use
3. Check firebaserc configuration
```

### Firestore Data Persistence Between Tests
```
Symptom: Test expects empty database but data from previous test exists
Solution:
- each test should create a new gameId
- Use cleanup between tests: afterEach(() => db.deleteAllData())
```

### Test Timeout
```
Symptom: "Test timed out after 5000ms"
Solution:
1. Increase timeout: test("...", async () => { ... }, 10000)
2. Check if waiting for something external (network, emulator)
3. Add debug logging to identify where it hangs
```

---

## Summary

- **68+ unit tests** - Fast feedback, no emulator needed
- **20+ integration tests** - Full game flow with Firebase
- **5 E2E tests** - Real browser gameplay scenarios
- **All passing** - Ready for production
- **House rules fully tested** - Stacking & Draw to Match production-ready
