# Uno - Asynchronous Multiplayer Card Game

A Bun-based monorepo for **Uno**, an asynchronous multiplayer card game using Firebase and React. Players can create games, invite others, and play in real-time with real-time Firestore updates.

## Documentation by Audience

Pick your path based on what you're doing:

### 🎮 For Players
Want to understand the game and its rules?
- **[GAME_RULES.md](GAME_RULES.md)** — Official UNO rules + optional house rules variants

### 👨‍💻 For Human Contributors (Developers)
Building features or fixing bugs?
1. Start here: **[README.md](README.md)** (this file) — Quick start & architecture overview
2. Deep dive: **[DESIGN.md](DESIGN.md)** — Data models, architecture, Firebase schema
3. Testing: **[TESTING.md](TESTING.md)** — How to run tests (unit, integration, e2e)
4. Features: **[ROADMAP.md](ROADMAP.md)** — Current status and planned features
5. Optional: **[docs/HOUSE_RULES/](docs/HOUSE_RULES/)** — Building house rules

### 🤖 For AI Agents (Codebase Automation)
Working on this codebase with Copilot?
1. Start here: **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — Development patterns and conventions
2. Game architecture: **[DESIGN.md](DESIGN.md)** — Data models and structure
3. Testing patterns: **[TESTING.md](TESTING.md)** — How we test
4. House rules: **[docs/HOUSE_RULES/RULE_DETAILS.md](docs/HOUSE_RULES/RULE_DETAILS.md)** — Implementation patterns for rules
5. Error handling: **[ERROR_HANDLING.md](ERROR_HANDLING.md)** — Error system design

### 📚 All Documentation
- **[DESIGN.md](DESIGN.md)** — Architecture, data models, Firebase schema
- **[GAME_RULES.md](GAME_RULES.md)** — Official rules and optional house rules
- **[TESTING.md](TESTING.md)** — Testing guide (unit, integration, e2e)
- **[INTEGRATION_TESTS.md](INTEGRATION_TESTS.md)** — Cloud Functions testing details
- **[E2E_TESTS.md](E2E_TESTS.md)** — Playwright e2e testing guide
- **[ERROR_HANDLING.md](ERROR_HANDLING.md)** — Error system and error codes
- **[ERROR_MIGRATION_GUIDE.md](ERROR_MIGRATION_GUIDE.md)** — Migrating to error codes
- **[ROADMAP.md](ROADMAP.md)** — Project status and roadmap
- **[docs/HOUSE_RULES/](docs/HOUSE_RULES/)** — Complete house rules documentation
  - [README.md](docs/HOUSE_RULES/README.md) — House rules overview
  - [INTERACTIONS.md](docs/HOUSE_RULES/INTERACTIONS.md) — How rules interact
  - [TESTING_STRATEGY.md](docs/HOUSE_RULES/TESTING_STRATEGY.md) — Test structure
  - [IMPLEMENTATION_STATUS.md](docs/HOUSE_RULES/IMPLEMENTATION_STATUS.md) — What's done, what's pending
  - [RULE_DETAILS.md](docs/HOUSE_RULES/RULE_DETAILS.md) — Building new rules
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — AI development guide

## Project Structure

This monorepo contains three main packages:

- **[@uno/web](packages/web)** - React frontend with responsive UI
- **[@uno/functions](packages/functions)** - Cloud Functions backend for game logic
- **[@uno/shared](packages/shared)** - Shared Zod schemas and TypeScript types

## Quick Start

### Prerequisites

- [Bun](https://bun.com) (v1.3.5 or later)
- [Firebase CLI](https://firebase.google.com/docs/cli) for local development

### Installation

From the root directory:

```bash
bun install
```

This hoists all workspace dependencies automatically.

### Development

Start the development environment:

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start

# Terminal 2: Run the web dev server
cd packages/web && bun dev

# Terminal 3 (optional): Run functions locally
cd packages/functions && bun build src/index.ts --outdir dist --target node --format cjs --external firebase-admin --external firebase-functions
```

The web app auto-connects to local emulators when `NODE_ENV !== "production"`:

- Auth emulator: `localhost:9099`
- Firestore emulator: `localhost:8080`
- Functions emulator: `localhost:5001`

### Production Build

**Web:**

```bash
cd packages/web
bun build ./src/index.html --outdir=dist --sourcemap --target=browser --env='UNO_PUBLIC_*'
bun start  # serves dist/
```

**Functions:**

```bash
cd packages/functions
bun build src/index.ts --outdir dist --target node --format cjs --external firebase-admin --external firebase-functions
```

## Testing

See **[TESTING.md](TESTING.md)** for comprehensive testing guide including unit, integration, and e2e tests.

### Quick Start

```bash
# Run all tests
bun test

# Run specific test file
bun test packages/functions/src/service/card-validation.test.ts

# Run with Firebase emulator (integration tests)
firebase emulators:start
bun test packages/functions
```

### Test Coverage

- ✅ **68+ unit tests** - Fast feedback, no emulator needed
- ✅ **20+ integration tests** - Full game flow with Firebase
- ✅ **5 E2E tests** - Real browser gameplay
- ✅ **House rules tests** - 51 tests for Stacking, 9 tests for Draw to Match

See [TESTING.md](TESTING.md), [INTEGRATION_TESTS.md](INTEGRATION_TESTS.md), and [E2E_TESTS.md](E2E_TESTS.md) for details.

## Architecture

### Frontend

**Routing** ([packages/web/src/router.tsx](packages/web/src/router.tsx)):

- Home → Login → AuthRequired (enforces Firebase auth) → ProfileRequired (ensures user profile exists) → Layout wrapper → Dashboard, Game/:gameId, Profile pages

**Auth & Profile Management:**

- `useUid()` hook and `AuthContext` provide authentication state
- `useUser()` and `ProfileContext` provide user profile data
- Automatic profile creation on first login

**UI Components:**

- Built with React 19 and React Router v7
- Styled with Mantine 8 component library and custom theme ([packages/web/src/theme.tsx](packages/web/src/theme.tsx))

### Backend

**Cloud Functions** ([packages/functions/src/index.ts](packages/functions/src/index.ts)):

- `createGame(request)` - Create a new game
- `joinGame(request)` - Join an existing game
- `startGame(request)` - Start a game (when all players ready)

Each function validates auth via `request.auth.uid` and delegates to a service layer.

**Service Layer** ([packages/functions/src/service/game-service.ts](packages/functions/src/service/game-service.ts)):

- Handles Firestore transactions for multi-document consistency
- Deck initialization and shuffling ([packages/functions/src/service/deck-utils.ts](packages/functions/src/service/deck-utils.ts))
- Game state management

### Data Validation

All data models use **Zod schemas** ([packages/shared/src/types.ts](packages/shared/src/types.ts)):

- **User** - Profile (displayName, avatar, email, stats)
- **Game** - Game metadata (config, players array, game state)
- **GamePlayer** - Player state within a game (public profile data)
- **PlayerHand** - Private hand data (readable only by owner)
- **Card** - Discriminated union of number, special, and wild cards
- **HouseRules** - stacking, jumpIn, sevenSwap, drawToMatch, zeroRotation

Both frontend and backend parse Firestore snapshots with schemas before use.

### Firestore Collections

```
/users/{userId}                      # User profile
/games/{gameId}                      # Game metadata
/games/{gameId}/players/{userId}     # Player state (public)
/games/{gameId}/hands/{userId}       # Player hand (private)
```

## Game Rules

See [GAME_RULES.md](GAME_RULES.md) for official UNO rules and house rules variants.

## Key Patterns

### Firestore Converters

Custom converters ensure automatic parsing with Zod schemas:

```typescript
const converter: FirestoreDataConverter<User, UserData> = {
  toFirestore: (user: User): UserData => user,
  fromFirestore: (snap): User =>
    UserSchema.parse({ id: snap.id, ...snap.data() }),
};
const ref = doc(db, "users", uid).withConverter(converter);
```

### Transactions

Multi-document writes use transactions for consistency:

```typescript
await db.runTransaction(async (t) => {
  // Atomic game + player creation
});
```

### Real-time Listeners

Frontend subscribes to game changes with cleanup:

```typescript
const unsubscribe = onSnapshot(gameRef, (snap) => {
  // Update game state
});
// Call unsubscribe() to prevent memory leaks
```

### Environment Variables

Web package loads env vars prefixed `UNO_PUBLIC_` from `.env`:

```
UNO_PUBLIC_FIREBASE_API_KEY=...
UNO_PUBLIC_FIREBASE_PROJECT_ID=...
```

Bun auto-loads these without dotenv.

## Development Conventions

- **Validation**: Zod for all data at Firestore read/API boundaries
- **Type Safety**: Type inference from Zod schemas (`z.infer<typeof Schema>`)
- **Package Manager**: Bun for all scripts, builds, and testing
- **Exports**: Named exports; avoid mutable defaults
- **Code Organization**:
  - Service logic in separate files (one function per file)
  - UI components in feature-based directories
  - Hooks in `hooks/` directory
  - Context providers with custom hooks

## Deployment

- **Web**: Deploy `dist/` folder to Firebase Hosting
- **Functions**: Deploy `dist/` folder as Cloud Functions

Use Firebase CLI for deployment:

```bash
firebase deploy
```

## Technology Stack

- **Runtime**: Bun
- **Frontend**: React 19, React Router v7, Mantine 8
- **Backend**: Firebase Cloud Functions, Firestore
- **Validation**: Zod
- **Language**: TypeScript
- **Build Tool**: Bun build (not Vite, not Webpack)

## Contributing

Follow the conventions outlined above. When adding features:

- Define Zod schemas first in `packages/shared/src/types.ts`
- Implement service logic in backend
- Add Cloud Functions for new operations
- Create React components and routes
- Test locally with emulators

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
