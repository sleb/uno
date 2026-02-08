# Error Handling Migration Guide

This document shows how to migrate existing error handling from string-based to code-based error handling.

## Three Key Scenarios

1. **Rules:** Throwing domain-specific errors instead of generic Error
2. **Cloud Functions:** Converting domain errors to HttpsError responses
3. **Frontend:** Extracting error codes instead of string matching

---

## Scenario 1: Game Rules

### BEFORE: String matching in error handling

File: `packages/functions/src/service/rules/wild-draw4-rule.ts`

```typescript
export const createWildDraw4Rule = (): Rule => ({
  name: "wild-draw4-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    const playedCard = context.playerHand.hand[context.action.cardIndex];

    if (!playedCard) {
      // Generic Error - consumer must parse message string
      throw new Error("Invalid card index");
    }

    if (playedCard.kind !== "wild" || playedCard.value !== "wild_draw4") {
      // Another generic error - no type information
      throw new Error("This rule only handles Wild Draw Four cards");
    }
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
```

Then in the Cloud Function (`play-card-function.ts`):

```typescript
catch (e) {
  if (e instanceof Error) {
    // String matching - fragile and error-prone
    if (e.message.includes("Invalid card index")) {
      throw new HttpsError("invalid-argument", e.message);
    }
    if (e.message.includes("This rule only handles")) {
      throw new HttpsError("invalid-argument", e.message);
    }
  }
  throw new HttpsError("internal", "An error occurred.");
}
```

Then on the frontend (`notifications.tsx`):

```typescript
if (err instanceof FirebaseError && err.message) {
  // More string matching - no type safety
  notify("error", { message: err.message });
}
```

### AFTER: Type-safe error codes

File: `packages/functions/src/service/rules/wild-draw4-rule.ts`

```typescript
import {
  ValidationError,
  ErrorCode,
} from "@uno/shared";

export const createWildDraw4Rule = (): Rule => ({
  name: "wild-draw4-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    const playedCard = context.playerHand.hand[context.action.cardIndex];

    if (!playedCard) {
      // Domain-specific error with error code
      throw new ValidationError(
        ErrorCode.INVALID_CARD_INDEX,
        "The card index is invalid or out of range",
        { providedIndex: context.action.cardIndex }
      );
    }

    if (playedCard.kind !== "wild" || playedCard.value !== "wild_draw4") {
      // Consumer can check error code, not message
      throw new ValidationError(
        ErrorCode.CARD_NOT_PLAYABLE,
        "This rule validates Wild Draw Four cards only"
      );
    }
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
```

Then in the Cloud Function (`play-card-function.ts`):

```typescript
import { safeguardError } from "../error-handling";

export const playCard = async (request) => {
  try {
    return await _playCard(gameId, userId, cardIndex, chosenColor);
  } catch (e) {
    // Single, unified error conversion - no more string matching
    throw safeguardError(e);
  }
};
```

Then on the frontend (`notifications.tsx`):

```typescript
import {
  extractErrorResponse,
  getErrorMessage,
  ErrorCode,
  hasErrorCode,
} from "../error-handling";

export const notifyError = (err: unknown) => {
  const errorResponse = extractErrorResponse(err);
  if (errorResponse) {
    // Type-safe error code check, not string matching
    if (errorResponse.code === ErrorCode.NOT_YOUR_TURN) {
      notify("error", { message: "Wait for your turn" });
      return;
    }
    if (errorResponse.code === ErrorCode.INVALID_CARD_INDEX) {
      notify("error", { message: "Card not found in your hand" });
      return;
    }
    // Fallback: get user-facing message from error code
    notify("error", { message: getErrorMessage(errorResponse) });
    return;
  }

  // Handle Firebase auth errors separately
  if (err instanceof FirebaseError) {
    const code = firebaseAuthErrorToErrorCode(err);
    notify("error", { message: ERROR_MESSAGES[code] });
    return;
  }

  // Fallback
  notify("error", { message: "An error occurred" });
};
```

---

## Scenario 2: Pass Turn Validation

### BEFORE: String-based error matching in multiple places

File: `packages/functions/src/service/rules/pass-action-validate-rule.ts`

```typescript
validate: (ctx: RuleContext): void => {
  if (ctx.action.type !== "pass") {
    return;
  }

  // String message - will be matched in Cloud Function
  if (ctx.game.state.mustDraw > 0) {
    throw new Error("You must draw cards before passing");
  }
},
```

File: `packages/functions/src/pass-turn-function.ts`

```typescript
catch (e) {
  if (e instanceof Error) {
    if (e.message.includes("must draw cards")) {
      // String matching required here
      throw new HttpsError("failed-precondition", "You must draw cards before passing.");
    }
  }
}
```

### AFTER: Type-safe error codes throughout

File: `packages/functions/src/service/rules/pass-action-validate-rule.ts`

```typescript
import { ValidationError, ErrorCode } from "@uno/shared";

validate: (ctx: RuleContext): void => {
  if (ctx.action.type !== "pass") {
    return;
  }

  // Specific error code - no string matching needed
  if (ctx.game.state.mustDraw > 0) {
    throw new ValidationError(
      ErrorCode.MUST_DRAW_CARDS,
      "Player must draw pending cards before passing",
      { pendingDrawCount: ctx.game.state.mustDraw }
    );
  }
},
```

File: `packages/functions/src/pass-turn-function.ts`

```typescript
import { safeguardError } from "../error-handling";

export const passTurn = async (request) => {
  try {
    return await _passTurn(gameId, userId);
  } catch (e) {
    // Single, unified error handling for all error types
    throw safeguardError(e);
  }
};
```

---

## Scenario 3: Turn Ownership Validation

### BEFORE: Generic error in rule + string matching in function

File: `packages/functions/src/service/rules/turn-ownership-rule.ts`

```typescript
validate: (context: RuleContext) => {
  if (context.game.state.status !== GAME_STATUSES.IN_PROGRESS) {
    // Generic message - will need string matching downstream
    throw new Error("Game is not in progress");
  }

  if (context.game.state.currentTurnPlayerId !== context.playerId) {
    // Another generic message
    throw new Error("Not your turn");
  }
},
```

File: `packages/functions/src/play-card-function.ts`

```typescript
catch (e) {
  if (e instanceof Error) {
    // Multiple string checks for each error
    if (e.message.includes("not in progress")) {
      throw new HttpsError("failed-precondition", "Game is not in progress.");
    }
    if (e.message.includes("Not your turn")) {
      throw new HttpsError("failed-precondition", "It is not your turn.");
    }
  }
}
```

### AFTER: Specific error codes throughout

File: `packages/functions/src/service/rules/turn-ownership-rule.ts`

```typescript
import { GameStateError, ErrorCode } from "@uno/shared";

validate: (context: RuleContext) => {
  if (context.game.state.status !== GAME_STATUSES.IN_PROGRESS) {
    throw new GameStateError(
      ErrorCode.GAME_NOT_IN_PROGRESS,
      "The game is not in progress",
      { status: context.game.state.status }
    );
  }

  if (context.game.state.currentTurnPlayerId !== context.playerId) {
    throw new GameStateError(
      ErrorCode.NOT_YOUR_TURN,
      "The current player does not match the request player",
      {
        currentTurnPlayerId: context.game.state.currentTurnPlayerId,
        playerId: context.playerId,
      }
    );
  }
},
```

File: `packages/functions/src/play-card-function.ts`

```typescript
import { safeguardError } from "../error-handling";

export const playCard = async (request) => {
  try {
    return await _playCard(gameId, userId, cardIndex, chosenColor);
  } catch (e) {
    // Unified error handling - works for all error codes
    throw safeguardError(e);
  }
};
```

File: `packages/web/src/components/game.tsx` (or wherever card play is handled)

```typescript
import {
  extractErrorResponse,
  getErrorMessage,
  ErrorCode,
} from "../error-handling";

async function handlePlayCard(cardIndex: number) {
  try {
    await playCard(gameId, cardIndex);
  } catch (err) {
    const response = extractErrorResponse(err);
    if (response?.code === ErrorCode.NOT_YOUR_TURN) {
      // Handle specifically - maybe show whose turn it is
      notify("info", { message: "Wait for your turn" });
    } else if (response) {
      // Fallback to standard message for this error code
      notify("error", { message: getErrorMessage(response) });
    } else {
      // Unknown error
      notify("error", { message: "An error occurred" });
    }
  }
}
```

---

## Summary of Changes

### In Rules:
- Replace `throw new Error("message")` with specific error classes
- Use `ErrorCode` enum instead of relying on message text
- Include relevant context in `details` parameter

### In Cloud Functions:
- Replace catch block string matching with `safeguardError(e)`
- Remove manual HttpsError construction for each message pattern
- Single try/catch pattern works for all error types

### On Frontend:
- Replace `err.message.includes()` checks with `extractErrorResponse()`
- Use `ErrorCode` checks instead of string matching
- Use `getErrorMessage()` for user-facing messages
- Handle auth errors via `firebaseAuthErrorToErrorCode()`

### Migration Checklist:
- [ ] Export error classes from `@uno/shared`
- [ ] Update all rules to throw `ValidationError`, `GameStateError`, etc.
- [ ] Update Cloud Functions to use `safeguardError()`
- [ ] Update `notifications.tsx` to use frontend error utilities
- [ ] Test auth error handling paths
- [ ] Test validation error paths
- [ ] Test game state error paths
- [ ] Remove all string matching from error handling
- [ ] Deploy with confidence!
