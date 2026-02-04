# E2E Testing Guide

End-to-end tests using Playwright to validate the complete multiplayer Uno gameplay flow.

## Quick Start

```bash
# Verify test users are configured
bun run verify:emulator-users

# Run all e2e tests
bun run test:e2e

# Interactive UI mode
bun run test:e2e:ui

# Run specific test
firebase emulators:exec --import .emulator 'bun test two-player-gameplay'
```

## Prerequisites

- Bun installed
- Firebase CLI installed
- Playwright browsers: `bunx playwright install`
- Pre-configured test users in `.emulator/` directory

## Test Users

The `.emulator/` directory contains two pre-configured accounts:

- **user.one@example.com** (User One) - UID: `lUXSmybJKqUzH1u6FPkkTpcKpImF`
- **user.two@example.com** (User Two) - UID: `PUFFvfmSjCYVU9wYgqMk67F259XP`

These are automatically loaded via `--import .emulator` flag.

## Test Coverage

### Smoke Tests (3 files)

**`auth-flow.spec.ts`** - Basic authentication UI

- Login page displays Google sign-in button
- Rules page loads without authentication

**`game-creation.spec.ts`** - Routing and navigation

- Login and rules pages load correctly
- Public vs protected route behavior

**`profile-stats.spec.ts`** - UI components

- Google sign-in button renders
- App loads without console errors

### Two-Player Gameplay (6 tests)

**`two-player-gameplay.spec.ts`** - Core multiplayer mechanics

1. **Create, Join, Start** - Complete lobby flow, 7-card initial deal
2. **Turn-Based Playing** - Alternating turns, card playing/drawing
3. **Draw Pile** - Drawing cards, hand count updates
4. **Real-Time Stats** - Multi-client synchronization
5. **Turn Enforcement** - Non-turn player cannot play
6. **Discard Pile** - Updates propagate to all clients

**Total**: 12/12 passing (100%)

### Not Yet Covered

- Special cards (Wild, Skip, Reverse, Draw Two)
- UNO calling and penalties
- Game completion and scoring
- Multi-round games
- Profile stats updates
- Edge cases (timeouts, disconnections)

## Test Helpers API

Located in `packages/web/e2e/helpers.ts`:

### Authentication

```typescript
// Sign in via emulator popup
await signInWithEmulator(page, "user.one@example.com");
```

### Game Flow

```typescript
const gameId = await createGame(page); // Create game
await joinGame(page, gameId); // Join game
await startGame(page); // Start game (host)
await waitForGameStatus(page, "active"); // Wait for status
```

### Gameplay

```typescript
await waitForMyTurn(page); // Wait for turn
const playable = await getPlayableCards(page); // Get playable indices
await playCard(page, 0); // Play card by index
await drawCard(page); // Draw from pile
const count = await getHandCount(page); // Get hand size
```

## Data Test IDs

### Game Status

- `game-status` - Status badge or turn indicator
- `is-my-turn` - Hidden div with `data-value="true|false"`

### Players

- `player-status` - Current player's card
- `player-hand-count` - Card count text
- `opponent-{userId}-status` - Opponent's card
- `opponent-{userId}-card-count` - Opponent's count

### Game Board

- `draw-pile` - Draw pile display
- `draw-pile-button` - Draw button
- `discard-pile` - Discard pile container
- `top-card-color` - Hidden div with color
- `top-card-value` - Hidden div with value

### Cards

- `hand-card-{index}` - Cards in hand (has `data-playable="true|false"`)

### Lobby

- `join-game-button` - Join game
- `start-game-button` - Start game

## Multi-Player Pattern

Tests use separate browser contexts to simulate independent users:

```typescript
test("multiplayer test", async ({ browser }) => {
  // Player 1
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await signInWithEmulator(page1, "user.one@example.com");
  const gameId = await createGame(page1);

  // Player 2
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await signInWithEmulator(page2, "user.two@example.com");
  await joinGame(page2, gameId);

  await startGame(page1);

  // Test gameplay...

  await context1.close();
  await context2.close();
});
```

This validates real-time Firestore synchronization across clients.

## Configuration

**Playwright** (`playwright.config.ts`):

- Test directory: `packages/web/e2e`
- Base URL: `http://localhost:3000`
- Browser: Chromium (Desktop Chrome)
- Auto-starts dev server
- HTML reporter

**Emulators**:

- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- Functions: `localhost:5001`

## Troubleshooting

**Test users not found**

```bash
# Verify emulator export
bun run verify:emulator-users

# If missing, export with:
firebase emulators:export .emulator
```

**Popup timeout**

- Check Auth emulator running on port 9099
- Verify `connectAuthEmulator()` in `firebase.ts`
- Run with `--debug` to inspect

**Flaky tests**

- Increase timeouts: `{ timeout: 30000 }`
- Use `waitForFunction()` for dynamic content
- Add explicit waits after async operations

**Game won't start**

- Need 2+ players in lobby
- Ensure `joinGame()` completes before `startGame()`

## CI Integration

Tests run in CI with:

- 2 retries on failure
- Single worker (serial execution)
- 30s timeout per test
- HTML report artifacts

```yaml
- name: E2E Tests
  run: bun run test:e2e
```

## Adding New Tests

1. Create file in `packages/web/e2e/`
2. Use `test.describe()` for grouping
3. Import helpers from `./helpers`
4. Add `data-testid` to UI components if needed
5. Test user behavior, not implementation
6. Run locally: `bun run test:e2e`

## Best Practices

- Use semantic selectors (`getByRole`, `getByText`)
- Prefer `waitForFunction()` over fixed delays
- Clean up contexts with `context.close()`
- Test real-time sync with multiple contexts
- Keep tests independent and isolated
