# Integration Testing Guide

Integration tests for Cloud Functions using Firebase emulators and Bun's test runner.

## Quick Start

```bash
# Run all integration tests (starts emulators)
firebase emulators:exec --only firestore "bun test packages/functions"

# Run specific test file
firebase emulators:exec --only firestore "bun test packages/functions/src/service/finalize-game.test.ts"

# Run only unit tests (no emulator needed)
bun test packages/functions --test-name-pattern="^((?!integration).)*$"
```

## Prerequisites

- Bun installed
- Firebase CLI installed
- Firestore emulator configured

## Test Structure

### Unit Tests (Fast)

**Location**: `packages/functions/src/service/*.test.ts`

Test pure functions without Firestore:

- **card-validation.test.ts** - Card playability, turn order, card effects (11 tests)
- **score-utils.test.ts** - Score calculation logic (13 tests)
- **game-service.test.ts** - Deck generation (3 tests)
- **finalize-game.test.ts** - Score calculation unit tests (5 tests)

**Total**: 32 unit tests

### Integration Tests (Firestore Required)

**Location**: `packages/functions/src/service/*.test.ts`

Test functions that interact with Firestore emulator:

**finalize-game.test.ts**:

- 2-player game completion with scoring and stats
- Backward compatibility (users without stats)

**game-actions.test.ts** (NEW):

- Play card and update game state
- Wild card with color selection
- Detect winner on last card
- Draw cards and update hand
- Fulfill draw penalty
- Advance turn after drawing
- Call UNO and set flag
- Catch opponent who forgot UNO
- Verify already-called UNO

**Total**: 11 integration tests (2 finalize + 9 actions)

## Test Coverage

### Card Validation (11 tests)

**`isCardPlayable()`**

- ✅ Blocks non-draw cards during draw penalty
- ✅ Allows draw cards to stack
- ✅ Wild cards always playable
- ✅ Color matching
- ✅ Value matching
- ✅ Current color handling for wild cards

**`getNextPlayerId()`**

- ✅ Clockwise advancement
- ✅ Counter-clockwise advancement
- ✅ Skip logic

**`applyCardEffect()`**

- ✅ Draw penalties (Draw Two, Wild Draw Four)
- ✅ Direction reversal
- ✅ Skip cards

### Score Calculation (13 tests)

**`calculateCardScore()`**

- ✅ Number cards (0-9)
- ✅ Special cards (20 points)
- ✅ Wild cards (50 points)

**`calculateHandScore()`**

- ✅ Empty hand
- ✅ Mixed hands
- ✅ All number cards
- ✅ All special cards
- ✅ All wild cards
- ✅ Single card

**`isSpecialCard()`**

- ✅ Number cards (not special)
- ✅ Action cards (special)
- ✅ Wild cards (special)

### Deck Generation (3 tests)

**`generateCardAtIndex()`**

- ✅ Deterministic for same seed
- ✅ Full 108-card deck generation
- ✅ Matches UNO deck histogram

### Game Finalization (2 integration tests)

**`finalizeGame()`**

- ✅ Complete 2-player game with scoring and stats
- ✅ Backward compatibility (users without stats)

### Game Actions (9 integration tests)

**`playCard()`**

- ✅ Play valid card and update state
- ✅ Handle wild card with color selection
- ✅ Detect winner when last card played

**`drawCard()`**

- ✅ Draw cards and update hand
- ✅ Fulfill draw penalty
- ✅ Advance turn after drawing

**`callUno()`**

- ✅ Set hasCalledUno flag
- ✅ Catch opponent who forgot UNO
- ✅ Verify already-called UNO protection

**Total**: 45 tests (32 unit + 11 integration + 2 legacy integration)

## Writing Integration Tests

### Basic Pattern

```typescript
import { beforeEach, afterEach, describe, expect, test } from "bun:test";

// Set emulator env BEFORE imports
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "test-project";

import { myFunction } from "./game-service";

const admin = require("firebase-admin");

let app: any;
let db: any;

beforeEach(async () => {
  app = admin.app();
  db = admin.firestore(app);
});

afterEach(async () => {
  // Clean up data between tests
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
});

test("integration test example", async () => {
  // Setup: Create test data
  await db
    .collection("users")
    .doc("user1")
    .set({
      displayName: "Test User",
      stats: { gamesPlayed: 0 },
    });

  // Execute: Call function with transaction
  await db.runTransaction(async (t: any) => {
    await myFunction("user1", t);
  });

  // Assert: Verify results
  const doc = await db.collection("users").doc("user1").get();
  expect(doc.data()?.stats.gamesPlayed).toBe(1);
});
```

### Key Patterns

**1. Environment Setup**

```typescript
// MUST be before imports
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_PROJECT_ID = "test-project";
```

**2. Use CommonJS for Admin SDK**

```typescript
const admin = require("firebase-admin");
```

**3. Clean Up Between Tests**

```typescript
afterEach(async () => {
  // Delete all collections
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
});
```

**4. Test Transactions**

```typescript
await db.runTransaction(async (t: any) => {
  await myFunction(params, t);
});
```

## Running Tests

### All Tests

```bash
# With emulator auto-start
firebase emulators:exec --only firestore "bun test packages/functions"

# Manual emulator (separate terminal)
firebase emulators:start --only firestore
bun test packages/functions
```

### Specific Tests

```bash
# Single file
bun test packages/functions/src/service/card-validation.test.ts

# By pattern
bun test packages/functions --test-name-pattern="isCardPlayable"

# Unit tests only (no emulator)
bun test packages/functions/src/service/card-validation.test.ts
bun test packages/functions/src/service/score-utils.test.ts
bun test packages/functions/src/service/game-service.test.ts
```

### Watch Mode

```bash
bun test --watch packages/functions
```

## Common Issues

### Firestore Emulator Not Running

**Error**: `ECONNREFUSED 127.0.0.1:8080`

**Solution**:

```bash
firebase emulators:start --only firestore
```

Or use `firebase emulators:exec`:

```bash
firebase emulators:exec --only firestore "bun test packages/functions"
```

### Transaction Read/Write Order

**Error**: `Cannot perform write after read in transaction`

**Solution**: All reads MUST come before all writes

```typescript
// ❌ Wrong
await t.get(doc1);
await t.set(doc1, data);
await t.get(doc2); // Error: read after write
await t.set(doc2, data);

// ✅ Correct
const snap1 = await t.get(doc1);
const snap2 = await t.get(doc2);
await t.set(doc1, data);
await t.set(doc2, data);
```

### Module Import Issues

**Error**: `Cannot find module firebase-admin`

**Solution**: Use CommonJS require

```typescript
const admin = require("firebase-admin");
```

### Test Isolation

**Issue**: Tests affect each other

**Solution**: Clean up in `afterEach()`

```typescript
afterEach(async () => {
  // Delete all test data
  const collections = await db.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  }
});
```

## Best Practices

### 1. Test Organization

```typescript
describe("Feature Name", () => {
  describe("subfunctionName", () => {
    test("should do specific thing", () => {
      // Arrange, Act, Assert
    });
  });
});
```

### 2. Use Descriptive Test Names

```typescript
// ✅ Good
test("should update winner stats when game completes");

// ❌ Bad
test("stats test");
```

### 3. AAA Pattern

```typescript
test("example", async () => {
  // Arrange: Set up test data
  await db.collection("users").doc("id").set({ ... });

  // Act: Execute function
  await myFunction("id");

  // Assert: Verify results
  const result = await db.collection("users").doc("id").get();
  expect(result.data()).toMatchObject({ ... });
});
```

### 4. Test Edge Cases

- Empty inputs
- Missing data
- Backward compatibility
- Concurrent modifications

### 5. Keep Tests Fast

- Use unit tests when possible (no emulator)
- Only use integration tests for Firestore interactions
- Clean up efficiently in `afterEach()`

## CI Integration

Tests run in CI with Firebase emulators:

```yaml
- name: Run Integration Tests
  run: firebase emulators:exec --only firestore "bun test packages/functions"
```

## Adding New Tests

1. Create test file: `*.test.ts` in service directory
2. Import from `bun:test`
3. Add `describe()` and `test()` blocks
4. For unit tests: no setup needed
5. For integration tests: add emulator setup
6. Run locally: `bun test path/to/file.test.ts`

## Test Data Helpers

Create reusable test data:

```typescript
const createTestUser = (id: string, stats = {}) => ({
  displayName: `User ${id}`,
  avatar: "🎮",
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalScore: 0,
    ...stats
  }
});

const createTestGame = (players: string[]) => ({
  createdAt: new Date().toISOString(),
  config: { isPrivate: false, maxPlayers: 4, houseRules: [] },
  state: { status: "in-progress", ... },
  players
});
```

## Coverage Summary

**Total Tests**: 45/45 passing (100%) ✅

**Coverage by Type**:

- Unit tests: 32 tests ✅
- Integration tests: 11 tests ✅
- Finalize game: 2 legacy integration tests ✅

**Coverage by Feature:**

- ✅ Card validation logic (11 tests)
- ✅ Score calculation (13 tests)
- ✅ Deck generation (3 tests)
- ✅ Score finalization logic (5 tests)
- ✅ Game finalization with Firestore (2 integration tests)
- ✅ Play card function (3 integration tests)
- ✅ Draw card function (3 integration tests)
- ✅ UNO calling (3 integration tests)

**Runtime**: ~38 seconds for full suite (integration tests 2-5s each)

**Recent Improvements**:

- ✅ Fixed transaction ordering issue in `playCard` + `finalizeGame`
- ✅ Refactored `finalizeGame` to accept pre-fetched data
- ✅ All reads now happen before all writes (Firestore transaction requirement)

## Future Enhancements

Potential additions:

- Multi-player game finalization (3-4 players)
- Error scenarios (missing data, invalid states)
- Performance tests (large player counts)
- Concurrent transaction tests
- Special card effect verification (Skip, Reverse, Draw Two)
- Wild Draw Four challenge mechanics
- Turn time limit enforcement
