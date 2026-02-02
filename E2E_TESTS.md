# E2E Test Setup

This document describes the E2E test setup using Playwright.

## Running E2E Tests

**Prerequisites:**
- Firebase emulators must be running (auth, firestore, functions)
- Web dev server is auto-started by Playwright

**Commands:**

```bash
# Run all E2E tests (headless)
bun run test:e2e

# Run with UI mode (interactive)
bun run test:e2e:ui

# Run specific test file
firebase emulators:exec 'playwright test e2e/auth-flow.spec.ts'

# Debug mode
firebase emulators:exec 'playwright test --debug'
```

## Test Structure

### Auth Flow Tests (`auth-flow.spec.ts`)
- ✅ Login page displays Google sign-in button
- ✅ Rules page loads without authentication  
- Tests redirect flow basics without requiring emulator auth popup

### Routing Tests (`game-creation.spec.ts`)
- ✅ Login page loads correctly
- ✅ Rules page loads without auth and shows content
- Verifies public vs protected route behavior

### UI Component Tests (`profile-stats.spec.ts`)
- ✅ Google sign-in button renders correctly
- ✅ App loads without console errors
- Basic smoke tests for UI integrity

## Configuration

**Playwright Config** (`playwright.config.ts`):
- Test directory: `packages/web/e2e`
- Base URL: `http://localhost:3000`
- Browser: Chromium (Desktop Chrome)
- Auto-starts dev server before tests
- HTML reporter for test results

**Environment:**
- Uses Firebase Auth emulator (localhost:9099)
- Uses Firestore emulator (localhost:8080)
- Uses Functions emulator (localhost:5001)
- Test data is isolated per test run (unique emails)

## Best Practices

1. **Use unique test emails** - Prevents conflicts between parallel test runs
2. **BeforeEach hooks** - Set up auth state consistently
3. **Explicit waits** - Use `expect().toBeVisible()` for dynamic content
4. **Semantic selectors** - Prefer role-based selectors (accessible)
5. **URL assertions** - Verify navigation with `toHaveURL()`

## Adding New Tests

1. Create test file in `packages/web/e2e/`
2. Use `test.describe()` for logical grouping
3. Add `beforeEach()` for common setup (auth, navigation)
4. Test user-facing behavior, not implementation details
5. Run locally before committing: `bun run test:e2e`

## CI Integration

E2E tests automatically:
- Run with 2 retries in CI
- Use single worker (serial execution)
- Start emulators via `firebase emulators:exec`
- Generate HTML report artifact

## Current Coverage

**Passing Tests (6/6):**
- ✅ Login page displays Google sign-in button
- ✅ Rules page loads without authentication (2 tests)
- ✅ UI components render correctly
- ✅ App loads without console errors
- ✅ Basic routing works

**Not Yet Covered:**
- ❌ Google OAuth flow (emulator popup interaction complex)
- ❌ Authenticated user workflows (game creation, profile)
- ❌ Multi-player game join (requires 2 browser contexts)
- ❌ Card playing mechanics (complex game state)
- ❌ Game completion and winner celebration
- ❌ Profile stats after playing games
- ❌ Dashboard filtering

**Coverage Assessment:**
- **Basic functionality**: ✅ GOOD - Smoke tests verify app loads and renders
- **Authenticated flows**: ❌ LIMITED - Requires emulator auth popup handling
- **Game mechanics**: ❌ NOT COVERED - Acceptable for initial E2E setup

**Note:** These are basic smoke tests. For full E2E coverage of authenticated flows, we'd need to either:
1. Implement custom auth state injection (bypassing popup)
2. Use Playwright's popup handling with emulator-specific selectors
3. Focus on integration tests for business logic (which we already have)

## Troubleshooting

**Emulators not starting:**
```bash
# Start manually in separate terminal
firebase emulators:start
```

**Test timeouts:**
- Increase timeout in test: `{ timeout: 30000 }`
- Check dev server is running on port 3000
- Verify emulators are accessible

**Flaky tests:**
- Add explicit waits for async operations
- Use `waitForURL()` instead of polling
- Check for race conditions in test setup
