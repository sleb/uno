# Error Handling System

**Status**: Production-ready. Idiomatic TypeScript error class hierarchy replaces string-based error matching.

## Overview

This error handling system provides **type-safe, domain-specific error classes** and **typed error codes** for the Uno game. It eliminates fragile string matching on error messages and provides three key benefits:

1. **Type Safety**: Error codes are TypeScript enums, not strings
2. **Domain Clarity**: Specific error classes (ValidationError, GameStateError, etc.)
3. **Efficient Serialization**: Error codes serialize cleanly for Cloud Functions

## Error Codes

All error codes are defined in `ErrorCode` enum in `packages/shared/src/errors.ts`:

### Validation Errors (4xx)
- `INVALID_CARD_INDEX` - Card index out of bounds
- `INVALID_REQUEST` - Request missing required fields
- `CARD_NOT_PLAYABLE` - Card cannot be played in current state
- `WILD_COLOR_REQUIRED` - Must specify color for wild card
- `INVALID_DRAW_COUNT` - Draw count invalid
- `MUST_DRAW_CARDS` - Player must draw before other actions
- `NOT_ENOUGH_CARDS` - Insufficient cards available
- `HAND_NOT_EMPTY` - Player still has cards (only relevant for game end)
- `INVALID_COLOR` - Invalid color choice

### Game State Errors (5xx)
- `GAME_NOT_FOUND` - Game record doesn't exist
- `PLAYER_NOT_FOUND` - Player not in game
- `USER_NOT_FOUND` - User account not found
- `GAME_NOT_IN_PROGRESS` - Game hasn't started
- `GAME_ALREADY_STARTED` - Game already started (can't join)
- `GAME_NOT_CREATED` - Game creation failed
- `NOT_YOUR_TURN` - It's not your turn
- `NOT_IN_GAME` - Player not in this game
- `MAX_PLAYERS_REACHED` - Game is full
- `MIN_PLAYERS_NOT_MET` - Not enough players to start

### Rule Violation Errors
- `RULE_CONFLICT` - Conflicting game rules triggered
- `ILLEGAL_STACKING` - Illegal stacking attempt

### Auth/Permission Errors
- `UNAUTHENTICATED` - User not logged in
- `PERMISSION_DENIED` - User lacks required permission

### Resource Errors
- `NOT_ENOUGH_CARDS` - Cards depleted
- `DECK_EXHAUSTED` - No cards to draw

### Internal Errors
- `INTERNAL_ERROR` - Unexpected error (shouldn't occur in normal operation)

## Error Classes

```
UnoError (base)
├── ValidationError     - Input validation, card legality checks
├── GameStateError      - Game/player records missing or wrong state
├── RuleViolationError  - Game rules violated during action
├── AuthError           - User authentication/permission issues
├── ResourceError       - Deck exhaustion, resource depletion
└── InternalError       - Unexpected errors (logging required)
```

## Backend: Throwing Errors

### In Service Layer

```typescript
import { ValidationError, GameStateError, ErrorCode } from "@uno/shared";

// Validation error
if (cardIndex < 0 || cardIndex >= hand.length) {
  throw new ValidationError(
    ErrorCode.INVALID_CARD_INDEX,
    `Card index ${cardIndex} out of bounds`,
    { cardIndex, handSize: hand.length }
  );
}

// Game state error
if (!gameDoc.exists()) {
  throw new GameStateError(
    ErrorCode.GAME_NOT_FOUND,
    `Game ${gameId} not found`,
    { gameId }
  );
}

// Rule violation
if (!canStack(currentCard, previousCard)) {
  throw new RuleViolationError(
    ErrorCode.ILLEGAL_STACKING,
    "Cannot stack this card",
    { currentCard, previousCard }
  );
}
```

### In Cloud Functions

```typescript
import { onCall } from "firebase-functions/https";
import { safeguardError } from "@uno/shared";

export const playCard = onCall(async (request) => {
  try {
    // Your service logic
    return await playCardService(request.auth.uid, request.data);
  } catch (error) {
    // Converts any error to properly formatted HttpsError
    throw safeguardError(error);
  }
});
```

The `safeguardError()` function:
1. Passes through existing HttpsError unchanged
2. Converts UnoError to HttpsError with ErrorResponse in details
3. Wraps unexpected Error objects with logging
4. Handles unknown error types gracefully

## Frontend: Handling Errors

### React Hook Pattern

```typescript
import { useErrorHandler, ErrorCode } from "~/hooks/useErrorHandler";

function GameComponent() {
  const { handleError, hasErrorCode } = useErrorHandler();

  const playCard = async (cardIndex: number) => {
    try {
      await playCardFunction({ cardIndex });
    } catch (error) {
      // Type-safe check without string matching
      if (hasErrorCode(error, ErrorCode.NOT_YOUR_TURN)) {
        console.log("Waiting for turn...");
        // Handle specially if needed
      } else {
        // Shows user-friendly message automatically
        handleError(error);
      }
    }
  };

  return <button onClick={() => playCard(0)}>Play Card</button>;
}
```

### Standard Usage

```typescript
// Most common: just show error to user
try {
  await someGameAction();
} catch (error) {
  handleError(error); // Handles everything, shows user message
}
```

### Advanced Usage

```typescript
const { hasErrorCode, isClientError, isServerError, getErrorMessage } = useErrorHandler();

try {
  await someGameAction();
} catch (error) {
  if (isClientError(response?.code)) {
    // Client/validation error - user's fault, show message
    handleError(error);
  } else if (isServerError(response?.code)) {
    // Server error - our fault, retry logic
    await retryWithBackoff(() => someGameAction());
  }
}
```

## User-Facing Messages

Error codes are mapped to user messages in `ERROR_MESSAGES` export in `packages/web/src/hooks/useErrorHandler.ts`. Each error code has a corresponding message:

```typescript
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CARD_INDEX]: "The selected card is not in your hand...",
  [ErrorCode.NOT_YOUR_TURN]: "It is not your turn. Please wait...",
  [ErrorCode.GAME_NOT_FOUND]: "The game could not be found...",
  // etc.
};
```

To update messages, edit this mapping. Messages are never constructed from error messages—they're always mapped by error code.

## Migration Path

### Phase 1: No Breaking Changes
The system is backward compatible. Old code continues to work:
```typescript
// Old way still works
throw new ValidationError(ErrorCode.NOT_YOUR_TURN, "message");
```

### Phase 2: Gradual Migration
Migrate files incrementally. Mixing old and new approaches is safe:
```typescript
// New specific classes
throw new NotYourTurnError("message");

// Old generic class
throw new ValidationError(ErrorCode.NOT_YOUR_TURN, "message");
// Both work identically
```

### Phase 3: Update Frontend
Convert error handling to use `useErrorHandler()` hook. Old code doesn't break—just add the hook alongside existing handlers.

**Recommendation**: Migrate incrementally as you touch each service/component. No need to refactor everything at once.

## Type Guards

Use type guards for precise error checking:

```typescript
import { isUnoError, hasErrorCode, isValidationError } from "@uno/shared";

try {
  await someAction();
} catch (error) {
  if (isUnoError(error)) {
    // error has .code property (typed as ErrorCode)
    if (hasErrorCode(error, ErrorCode.NOT_YOUR_TURN)) {
      // Handle specifically
    }
  }

  if (isValidationError(error)) {
    // error is ValidationError instance
    // Has additional context in .details property
  }
}
```

## Best Practices

### 1. Always Include Details
Provide rich context for debugging:
```typescript
throw new ValidationError(
  ErrorCode.INVALID_CARD_INDEX,
  `Card index ${index} out of bounds`,
  { cardIndex: index, handSize: hand.length } // Include details
);
```

### 2. Use Correct Error Class
Choose the most specific class:
- **ValidationError**: Input validation, immediate rejection
- **GameStateError**: Record not found or wrong state
- **RuleViolationError**: Rules violated during action
- **AuthError**: Permission/authentication issues
- **ResourceError**: Resources depleted
- **InternalError**: Unexpected errors (rare)

### 3. Don't Throw HttpsError from Services
Let the Cloud Function wrapper handle conversion:
```typescript
// ❌ Don't do this in services
throw new HttpsError("invalid-argument", "message");

// ✅ Do this instead
throw new ValidationError(ErrorCode.INVALID_CARD_INDEX, "message");

// Cloud Function wrapper converts it
export const myFunc = onCall(async (req) => {
  try {
    return await myService(req.data);
  } catch (e) {
    throw safeguardError(e); // Handles the conversion
  }
});
```

### 4. Frontend: Never Match on Error Message
```typescript
// ❌ Fragile - breaks if message changes
if (error.message.includes("not your turn")) { ... }

// ✅ Type-safe - always works
if (hasErrorCode(error, ErrorCode.NOT_YOUR_TURN)) { ... }
```

### 5. Map All Codes to User Messages
Never show raw error messages to users:
```typescript
// ❌ Don't do this
notify("error", { message: error.message });

// ✅ Do this
const { handleError } = useErrorHandler();
handleError(error); // Automatically shows proper user message
```

## File Structure

- `packages/shared/src/errors.ts` - Error class definitions and ErrorCode enum
- `packages/shared/src/index.ts` - Exports error classes for use in all packages
- `packages/functions/src/service/errors.ts` - Cloud Function adapters (safeguardError, etc.)
- `packages/web/src/hooks/useErrorHandler.ts` - React hook for frontend error handling

## References

- **ErrorCode enum**: See `packages/shared/src/errors.ts` for all codes with comments
- **User messages**: See `packages/web/src/hooks/useErrorHandler.ts` for ERROR_MESSAGES constant
- **Usage examples**: Check test files and component implementations for real-world patterns
