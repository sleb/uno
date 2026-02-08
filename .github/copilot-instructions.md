# Copilot Instructions

## Project Overview

Bun-based monorepo for **Uno**, an asynchronous multiplayer card game using Firebase. Three packages: `@uno/web` (React frontend), `@uno/functions` (Cloud Functions backend), `@uno/shared` (Zod schemas and types).

## Build, Test, and Lint Commands

**Linting** (from root or any package directory):
```bash
bun run lint          # Run Biome linter (check only)
biome lint --write    # Auto-fix linting issues
```

**Building**:
```bash
# Web (production build with minification)
cd packages/web && bun run build    # Uses build.ts script

# Functions (production build targeting Node 22)
cd packages/functions && bun run build    # Uses build.ts script
```

**Development servers**:
```bash
# Web (hot-reload dev server)
cd packages/web && bun dev

# Web (serve production build)
cd packages/web && bun start

# Firebase emulators (required for local development)
firebase emulators:start    # Runs auth:9099, firestore:8080, functions:5001
```

**Testing**:
```bash
# Run all tests
bun test

# Run specific test file
bun test packages/functions/src/service/game-service.test.ts

# Watch mode
bun test --watch
```

Tests use Bun's built-in test runner (imported from `bun:test`). No Jest or Vitest.

## Setup & Development

**Install & run**: From root, `bun install` (hoists workspace deps).

**Environment**: Web loads env vars prefixed `UNO_PUBLIC_` from `.env` (no dotenv needed; Bun auto-loads). When `NODE_ENV !== "production"`, client auto-connects to emulators (9099 auth, 8080 firestore, 5001 functions). Set up emulators locally via Firebase CLI for development.

## Architecture

**Frontend routing** ([packages/web/src/router.tsx](packages/web/src/router.tsx)): Home → Login → AuthRequired (enforces Firebase auth) → ProfileRequired (ensures user profile exists) → Layout wrapper → Dashboard, Game/:gameId, Profile pages. `useUid()` hook and `AuthContext` provide auth state; `useUser()` and `ProfileContext` provide user data.

**Backend functions** ([packages/functions/src/index.ts](packages/functions/src/index.ts)): `createGame(request)` and `joinGame(request)` exported as `onCall` handlers. Both validate auth via `request.auth.uid` and delegate to service layer ([packages/functions/src/service/game-service.ts](packages/functions/src/service/game-service.ts)). Errors returned as `HttpsError` with logging.

**Data flow**: Frontend calls `httpsCallable(functions, "createGame")(request)` → Cloud Function validates & parses request with `CreateGameRequestSchema` → Service writes to Firestore with transaction → Response parsed with `CreateGameResponseSchema`. Real-time updates via `onSnapshot()` subscriptions on game and player docs.

## Key Patterns

**Zod schemas & validation**: All data models (User, Game, GamePlayer, Card, etc.) defined in [packages/shared/src/types.ts](packages/shared/src/types.ts) with Zod. Backend and frontend both parse snapshots (e.g., `GameDataSchema.parse(doc.data())`) before use. Type inference via `z.infer<typeof Schema>`.

**Firestore converters**: Custom converters wrap `withConverter()` to auto-parse snapshots. Example from [packages/web/src/service/profile-service.ts](packages/web/src/service/profile-service.ts):

```ts
const converter: FirestoreDataConverter<User, UserData> = {
  toFirestore: (user: User): UserData => user,
  fromFirestore: (snap): User =>
    UserSchema.parse({ id: snap.id, ...snap.data() }),
};
const ref = doc(db, "users", uid).withConverter(converter);
```

**Transactions for consistency**: Multi-document writes (game + player creation) use `db.runTransaction(async (t) => { ... })`. Example: `addPlayerToGame` checks game status, updates players array, and creates player doc atomically. Prevents orphaned docs and race conditions.

**Real-time listeners**: Frontend subscribes to game changes via `onSnapshot()` wrappers in [packages/web/src/service/game-service.ts](packages/web/src/service/game-service.ts) (e.g., `onGameUpdate`, `onGamePlayersUpdate`, `onUserGamesUpdate`). Unsubscribe by calling returned function to prevent memory leaks.

**Cloud Function structure**: Each function in a separate file (e.g., [packages/functions/src/create-game-function.ts](packages/functions/src/create-game-function.ts)) validates auth, parses request, calls service, catches errors. Service layer ([packages/functions/src/service/game-service.ts](packages/functions/src/service/game-service.ts)) handles Firestore logic with optional transaction param for reuse in transactions.

**UI components**: React 19 with React Router v7. Mantine 8 for components & theming ([packages/web/src/theme.tsx](packages/web/src/theme.tsx)). TanStack Query integrated for server state management. Wrapper components like `AuthRequired` and `ProfileRequired` handle gating and provide context to children.

**Deck management**: Uses deterministic card generation via seed-based algorithm ([packages/functions/src/service/deck-utils.ts](packages/functions/src/service/deck-utils.ts)). Draw pile is computed on-demand by removing discard pile and player hands from canonical 108-card deck, then using `deckSeed` to shuffle. This prevents card duplication and enables efficient reshuffling when deck exhausts.

## Firestore Collections & Conventions

Structure (from [DESIGN.md](DESIGN.md)):

- `/users/{userId}` – Profile (displayName, avatar)
- `/games/{gameId}` – Game metadata (config, players array, game state, discard pile)
- `/games/{gameId}/players/{userId}` – Public player state (displayName, avatar, cardCount, status, gameStats)
- `/games/{gameId}/playerHands/{userId}` – Private hand data (readable only by owner via security rules)

**Important**: Player hands are in a separate subcollection with strict security rules. Align new fields with DESIGN.md. Keep player data in subcollection for scalability (don't fetch all players' hands unless needed).

## Common Tasks

- **Add a Cloud Function**: Create file in `packages/functions/src/` (e.g., `foo-function.ts`), export handler as `onCall()`, add to [packages/functions/src/index.ts](packages/functions/src/index.ts). Export service logic separately for reusability in transactions.
- **Add Firestore data**: Define Zod schema in [packages/shared/src/types.ts](packages/shared/src/types.ts), export from [packages/shared/src/index.ts](packages/shared/src/index.ts), use converter pattern in both frontend and backend. Parse all Firestore data before use.
- **Add UI page**: Create component in `packages/web/src/components/{feature}/`, add route to [router.tsx](packages/web/src/router.tsx), wrap with appropriate auth gate (`AuthRequired` or `ProfileRequired`).
- **Debug locally**: Set `NODE_ENV=development`, start Firebase emulators (`firebase emulators:start` on ports 9099/8080/5001), run `bun dev` in `packages/web`.
- **Add tests**: Create `*.test.ts` file next to code, import from `bun:test`, use `describe`, `test`, `expect`. Run with `bun test` or `bun test --watch`.

## Feature Development Workflow

For **non-trivial features**, follow this structured workflow to ensure quality design and implementation:

### Phase 1: Design (Feature Architect)
When user requests a new feature:
1. **Delegate to `feature-architect` agent** to analyze requirements and codebase
2. Agent produces:
   - Architecture design with rationale
   - Detailed execution plan with phases
   - Risk analysis and alternatives considered
   - Integration points with existing code
3. **Review the design** with the user before proceeding

### Phase 2: Implementation (Clean-Coder + Feature-Architect Feedback Loop)
For each phase of the plan:
1. **Delegate to `clean-code-engineer` agent** to implement the phase
2. **After implementation, request feature-architect to review** the changes:
   - Code quality against design
   - Any architectural issues
   - Missed opportunities or problems
3. **Handle feedback**:
   - If architect's suggestions are straightforward → apply them directly
   - If there's disagreement → have both agents present pros/cons for each approach, then I recommend
   - If still unclear → check with user for final decision
4. **Repeat** until all phases complete

### Phase 3: Validation & Cleanup
After all phases implemented:
1. **Run full test suite**: `bun test`
2. **Check lint**: `biome lint` (auto-fix with `biome lint --write`)
3. **Fix any issues** found (compilation errors, test failures, lint violations)
4. **Clean up temporary files**: Remove design documents, temporary test files, or example files created during design/implement process
5. **Verify**: Build both packages (`bun run build` in functions and web)

### When to Use This Workflow

- ✅ New feature requiring 2+ hours work
- ✅ Changes affecting multiple packages (web + functions + shared)
- ✅ Architectural decisions (new service layer, new data model, new error handling)
- ✅ Complex business logic (game rules, validation, state management)

**Not needed for**:
- Bug fixes with obvious solutions
- Minor UI tweaks
- Small isolated changes

## Custom Agents

**IMPORTANT:** This project has specialized custom agents configured in Copilot. **Always prefer using these agents over doing work yourself** when the user's request matches the agent's purpose.

### When to Delegate to Custom Agents

**`feature-architect` agent** - Use when user asks to design or plan features:
- Trigger phrases: "design a feature", "create a plan for", "how should I implement", "architect this"
- Examples: "Design a scoring system", "Create a plan for Phase 2", "How should I implement notifications?"
- **This agent analyzes the codebase, proposes architecture, explains design rationale, and identifies refactoring opportunities**

**`clean-code-engineer` agent** - Use when user asks to implement features or write code:
- Trigger phrases: "implement this feature", "build this functionality", "write code for", "refactor this", "add this to the codebase"
- Examples: "Implement the scoring system", "Build a leaderboard", "Refactor the game service"
- **This agent implements features with modern best practices and clean code principles**

**`smart-committer` agent** - Use when user asks to commit changes:
- Trigger phrases: "commit my changes", "create a commit", "make a commit", "time to commit"
- Examples: "Commit my changes", "Prepare commits for this work"
- **This agent analyzes diffs, proposes logical commit groupings, and writes conventional commit messages**

### Agent Usage Guidelines

1. **Check for matching agents FIRST** before doing work yourself
2. If a custom agent exists for the task, delegate to it - these agents have specialized knowledge for this project
3. Only do work yourself if no custom agent matches the request
4. Custom agents run in separate context windows - they keep your main conversation clean

## Conventions

- **Validation**: Always use Zod schemas for all data validation; parse early (at Firestore read/API call boundaries). Never trust raw Firestore data.
- **Type Safety**: Use `z.infer<typeof Schema>` for TypeScript types. Use Firestore converters with `withConverter()` for automatic parsing.
- **Environment**: Keep config in `.env` with `UNO_PUBLIC_` prefix for client exposure. Bun auto-loads `.env` files.
- **Exports**: Named exports only; avoid mutable default exports.
- **Build Tools**: Use Bun exclusively for scripts, builds, and testing (not Node, npm, Vite, Webpack, Jest, or Vitest).
- **Code Organization**:
  - One Cloud Function per file with matching service function
  - UI components in feature-based directories under `packages/web/src/components/`
  - Shared hooks in `packages/web/src/hooks/`
  - Context providers export custom hooks (e.g., `AuthContext` exports `useUid()`)
- **Error Handling**: Cloud Functions throw `HttpsError` for client-facing errors; log unexpected errors before throwing.
- **Formatting**: Biome handles formatting (2-space indentation). Run `biome lint --write` to auto-fix.
