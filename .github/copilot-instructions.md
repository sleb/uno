# Copilot Instructions

## Project Overview

Bun-based monorepo for **Uno**, an asynchronous multiplayer card game using Firebase. Three packages: `@uno/web` (React frontend), `@uno/functions` (Cloud Functions backend), `@uno/shared` (Zod schemas and types).

## Setup & Development

**Install & run**: From root, `bun install` (hoists workspace deps). Per-package:

- **Web**: `packages/web` → `bun dev` (hot-reload), `bun build ./src/index.html --outdir=dist --sourcemap --target=browser --env='UNO_PUBLIC_*'`, `bun start` (serves dist)
- **Functions**: `packages/functions` → `bun build src/index.ts --outdir dist --target node --format cjs --external firebase-admin --external firebase-functions` (target Node 22)

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

**UI components**: React 19 with React Router v7. Mantine 8 for components & theming ([packages/web/src/theme.tsx](packages/web/src/theme.tsx)). TanStack Query not yet integrated (future). Wrapper components like `AuthRequired` and `ProfileRequired` handle gating and provide context to children.

## Firestore Collections & Conventions

Structure (from [DESIGN.md](DESIGN.md)):

- `/users/{userId}` – Profile (displayName, avatar, email, stats)
- `/games/{gameId}` – Game metadata (config, players array, game state)
- `/games/{gameId}/players/{userId}` – Player state (hand, cardCount, status, gameStats)

Align new fields with DESIGN.md. Keep player data in subcollection for scalability (don't fetch all players' hands unless needed).

## Common Tasks

- **Add a Cloud Function**: Create file in `packages/functions/src/` (e.g., `foo-function.ts`), export handler, add to [packages/functions/src/index.ts](packages/functions/src/index.ts). Export service logic separately.
- **Add Firestore data**: Define Zod schema in [packages/shared/src/types.ts](packages/shared/src/types.ts), export from [packages/shared/src/index.ts](packages/shared/src/index.ts), use converter pattern in both frontend and backend.
- **Add UI page**: Create component in `packages/web/src/components/{feature}/`, add route to router, wrap with appropriate auth gate.
- **Debug locally**: Set `NODE_ENV=development`, start Firebase emulators (ports 9099/8080/5001), run `bun dev` for web and functions.

## Conventions

- Prefer Zod for all validation; parse early (at Firestore read/API call boundaries).
- Use Firestore converters for type safety and consistent parsing.
- Keep environment config in `.env` with `UNO_PUBLIC_` prefix for client exposure.
- Avoid mutable default exports; prefer named exports.
- Use Bun for all scripts, builds, and eventual testing (not Node, npm, Vite, Jest).
