# Critical Error Handling Improvements - Architecture Design

**Date:** February 8, 2026
**Status:** Design Phase
**Scope:** Two critical error handling improvements for production readiness

---

## Executive Summary

This document provides a detailed architecture design for two critical error handling improvements:

1. **Frontend Error Handler Hook Integration** - Eliminate raw error messages and ensure all frontend errors map through `useErrorHandler()`
2. **Rule Error Boundary** - Capture context when rules throw unexpected errors during validation/apply phases

Both improvements address production readiness concerns without breaking existing functionality.

---

## Part 1: Frontend Error Handler Hook Integration

### Current State Analysis

#### Hook Exists But Unused
- **Location:** [packages/web/src/hooks/useErrorHandler.ts](packages/web/src/hooks/useErrorHandler.ts)
- **Status:** Fully implemented with 298 lines
- **Provides:**
  - `ERROR_MESSAGES` constant mapping ErrorCode → user message (lines 46-95)
  - `handleError(error)` - parses error and shows notification (lines 270-282)
  - `getErrorMessage(error)` - extracts typed message (lines 217-239)
  - `extractErrorResponse(error)` - parses HttpsError.details (lines 168-202)
  - `hasErrorCode(error, code)` - type-safe error checking (lines 244-250)
  - `isClientError()` / `isServerError()` - error categorization (lines 253-276)

#### Notifications System Bypasses Hook
- **Location:** [packages/web/src/components/notifications.tsx](packages/web/src/components/notifications.tsx)
- **Function:** `notifyError(err: unknown)` (lines 47-85)
- **Problem:** Extracts raw error messages, bypassing `ERROR_MESSAGES` mapping:
  - Uses Firebase auth error codes → shows auth-specific messages ✓
  - Uses Error.message directly → shows raw backend messages ✗
  - No ErrorCode lookup → type-safety lost ✗

#### Components Call notifyError Directly
- **game-board.tsx** (5 calls at lines 135, 169, 184, 210, plus wildcards)
  - `handlePlayCard()` line 135: `notifyError(error)`
  - `handleDrawCard()` line 169: `notifyError(error)`
  - `handleJoinGame()` line 184: `notifyError(error)`
  - `handlePassTurn()` line 210: `notifyError(error)`
- **login-form.tsx** (line 17)
- **create-profile-page.tsx** (line 30)
- **profile-provider.tsx** (line 26)

**Impact:** Each component shows inconsistent error messages; type-safe handling defeated.

### Design: Hook Integration Strategy

#### Goal
Ensure all frontend errors flow through `useErrorHandler().handleError()` to map ErrorCodes to user messages consistently.

#### Architecture Decision: Hybrid Approach

**Option 1: Direct Hook Integration** ❌ Not viable
- Each component needs `useErrorHandler()` hook
- Adds boilerplate to every error handler
- Some components aren't React components (no hooks)

**Option 2: Enhanced notifyError() with Backward Compatibility** ✅ **Recommended**
- Keep `notifyError()` as public API
- Teach it to extract ErrorCode from HttpsError
- Use hook internally for message mapping
- No refactor needed; existing calls work as-is
- Hook still available for advanced use cases

**Option 3: Higher-Order Component Wrapper** △ Too complex
- Returns wrapped component with error handling
- Requires refactoring all components
- Extra abstraction layer

#### Recommended Implementation Pattern

```
Error Flow with Hook Integration:
┌─────────────────────────────────────────────────────────┐
│ Component throws error from Cloud Function              │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ Try/catch: notifyError(error)                           │
│ OR useErrorHandler().handleError(error)                 │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ notifyError(): Parse error                              │
│ 1. Check if HttpsError with HttpsError.details          │
│ 2. Extract ErrorResponse from details                   │
│ 3. Look up ErrorCode in ERROR_MESSAGES                  │
│ 4. Fall back to Firebase auth errors                    │
│ 5. Fall back to Error.message                           │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ notifications.show({ message: user-friendly text })    │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details: Critical #1

#### 1.1 Update `notifyError()` Function

**File:** [packages/web/src/components/notifications.tsx](packages/web/src/components/notifications.tsx)

**Change Type:** Enhancement with backward compatibility

```typescript
/**
 * NEW at top of file:
 */
import {
  type ErrorResponse,
  ErrorCode,
  parseErrorResponse,
  ERROR_MESSAGES  // Import from useErrorHandler.ts
} from "@uno/shared";

/**
 * UPDATED notifyError() - Now handles ErrorCode mapping:
 */
export const notifyError = (err: unknown) => {
  console.error("Error encountered:", err);

  // NEW: Try to extract Uno ErrorResponse (HttpsError.details)
  if (err instanceof FirebaseError) {
    const httpError = err as FirebaseError & { details?: unknown };
    const errorResponse = parseErrorResponse(httpError.details);

    if (errorResponse && ErrorCode[errorResponse.code]) {
      // NEW: Use ErrorCode → user message mapping
      const userMessage = ERROR_MESSAGES[errorResponse.code] || errorResponse.message;
      notify("error", { message: userMessage });
      return; // <-- EXIT HERE, mapped successfully
    }

    // EXISTING: Fall back to Firebase auth error codes
    switch (err.code) {
      case "auth/network-request-failed":
        notify("error", {
          message: "Network error. Please check your internet connection.",
        });
        return;
      // ... rest of auth errors ...
    }
  }

  // EXISTING: Fall back to Error.message
  if (err instanceof Error && err.message) {
    notify("error", { message: err.message });
    return;
  }

  // EXISTING: Generic fallback
  notify("error", {
    message: "An unexpected error occurred. Please try again.",
  });
};
```

**Why This Works:**
- ✅ ErrorCode extracted from HttpsError.details (typed)
- ✅ `ERROR_MESSAGES` lookup (consistent with hook)
- ✅ Falls back to Firebase auth codes
- ✅ Falls back to Error.message (backward compatible)
- ✅ No refactoring needed for existing calls
- ✅ `useErrorHandler()` still available for complex cases

#### 1.2 Reference Implementation in Game Board

**File:** [packages/web/src/components/game/game-board.tsx](packages/web/src/components/game/game-board.tsx)

**Current Code (lines 129-135):**
```typescript
const handlePlayCard = async (cardIndex: number, chosenColor?: Color) => {
  setIsProcessing(true);
  try {
    const request = PlayCardRequestSchema.parse({...});
    await playCard(request);
  } catch (error) {
    notifyError(error);  // ← Works with enhanced notifyError()
  } finally {
    setIsProcessing(false);
  }
};
```

**No changes needed!** Enhanced `notifyError()` handles the error automatically.

**For Advanced Cases** (optional pattern, not required for refactor):
```typescript
const { handleError, hasErrorCode } = useErrorHandler();

const handlePlayCard = async (cardIndex: number, chosenColor?: Color) => {
  setIsProcessing(true);
  try {
    await playCard(request);
  } catch (error) {
    if (hasErrorCode(error, ErrorCode.NOT_YOUR_TURN)) {
      // Custom UI behavior specific to this error
      console.log("Waiting for turn...");
    }
    handleError(error);  // ← Also uses ERROR_MESSAGES
  } finally {
    setIsProcessing(false);
  }
};
```

#### 1.3 Import Requirements

Update `ERROR_MESSAGES` export in packages:

**In `packages/shared/src/index.ts`:**
```typescript
// Already exported from errors.ts
export { ErrorCode, ErrorMessage, ... };
```

**In `packages/web/src/components/notifications.tsx`:**
```typescript
// Add these imports:
import {
  type ErrorResponse,
  ErrorCode,
  parseErrorResponse
} from "@uno/shared";

// Import ERROR_MESSAGES from useErrorHandler (new export)
import { ERROR_MESSAGES } from "../hooks/useErrorHandler";
```

**In `packages/web/src/hooks/useErrorHandler.ts`:**
```typescript
// Already defined and used internally
export const ERROR_MESSAGES: Record<ErrorCode, string> = { ... };
```

### Part 2: Rule Error Boundary

---

## Part 2: Rule Error Boundary

### Current State Analysis

#### Rules Execute in Pipeline Without Context Capture

**Location:** [packages/functions/src/service/rules/pipeline.ts](packages/functions/src/service/rules/pipeline.ts)

**Current Flow (lines 13-68):**
```typescript
export const applyRulePhase = (
  pipeline: RulePipeline,
  phase: RulePipelinePhase,
  context: RuleContext,
): RuleResult => {
  const effects = [];

  for (const rule of pipeline[phase]) {
    if (!rule.canHandle(context)) continue;

    // Validate dependencies...
    if (rule.dependencies) {
      validateDependencies(rule.name, rule.dependencies, context);
    }

    if (shouldValidate) {
      rule.validate?.(context);  // ← No error boundary here
    }

    if (shouldApply) {
      const result = rule.apply(context);  // ← No error boundary here

      // Tag effects with sourceRule
      const taggedEffects = result.effects.map((effect) => ({
        ...effect,
        sourceRule: rule.name,  // ← Named here
      }));
      effects.push(...taggedEffects);
    }
  }

  return { effects, cardsDrawn };
};
```

**Problem Analysis:**
1. **Missing Context on Unexpected Errors**
   - If `rule.validate?.(context)` throws unexpected error (not UnoError):
     - No rule name in error context
     - Error logged generically by `safeguardError()`
     - Backend logs show error without rule context
     - Frontend shows generic "unexpected error"

2. **Example Failure Scenario:**
   ```typescript
   // In card-playable-rule.ts validate():
   rule.validate(context) {
     const card = context.playerHand.cards[context.action.cardIndex];
     // If card is undefined (unexpected state):
     const color = card.color;  // ← TypeError: Cannot read property 'color' of undefined
     // This error is NOT a ValidationError, it's a generic JavaScript error
   }

   // In pipeline.ts:
   rule.validate?.(context);  // ← Error thrown here, no context about which rule

   // In safeguardError():
   logError("Unexpected error in Cloud Function", {
     message: "Cannot read property 'color' of undefined",
     stack: "...",
     type: "TypeError",
   });
   // ← No mention of "card-playable-rule" in the log!
   ```

3. **Debugging Impact**
   - Log shows error occurred
   - Doesn't indicate which rule failed
   - Developer must manually trace back to rule files
   - In production, rule context lost

#### sourceRule Field Already Tagged for Effects
- Effects get `sourceRule: rule.name` (line 51, 97)
- But when rule throws, this metadata isn't used
- **Inconsistency:** Apply succeeds with rule context, validate/finalize fails without

### Design: Rule Error Boundary Strategy

#### Goal
When a rule throws ANY error (not just UnoError), convert to InternalError with rule name and context.

#### Architecture Decision: Wrapper Function Pattern

**Option 1: Inline try/catch in Pipeline** ❌
- Makes pipeline.ts more complex
- Same logic repeated for validate, apply, finalize
- Harder to test

**Option 2: Wrapper Function `withRuleErrorHandling()` in util** ✅ **Recommended**
- Reusable across all rule phases
- Single error conversion point
- Easy to test independently
- Isolated concerns

**Option 3: Rule Decorator** △ Over-engineered
- Requires changes to Rule type definition
- More complex than needed

#### Recommended Implementation Pattern

```
Error Flow with Rule Boundary:
┌─────────────────────────────────────────────────────────┐
│ Pipeline.applyRulePhase() iterates rules                │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ withRuleErrorHandling(rule.validate, rule.name):        │
│   try {                                                  │
│     rule.validate(context)                               │
│   } catch (error) {                                      │
│     if (UnoError) return error as-is                    │
│     else wrap in InternalError with rule context        │
│   }                                                      │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ Result: InternalError with details: { rule: "name" }   │
│ → safeguardError() logs & converts to HttpsError        │
└──────────────┬──────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────────────┐
│ Frontend receives InternalError with rule name          │
│ Logs show: { code: "INTERNAL_ERROR", details.rule }    │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details: Critical #2

#### 2.1 Create Rule Error Handling Utility

**New File:** `packages/functions/src/service/rules/rule-error-handling.ts`

```typescript
import { InternalError, isUnoError, type ErrorCode } from "@uno/shared";
import { error as logError } from "firebase-functions/logger";
import type { RuleContext } from "./types";

/**
 * Wraps rule validate/apply functions with error boundary.
 *
 * Catches unexpected errors and converts to InternalError with rule context.
 * UnoErrors are passed through unchanged.
 *
 * This ensures rule errors always have rule context for debugging.
 *
 * @param ruleName - Name of the rule for error context
 * @param rulePhase - Phase being executed (validate, apply, finalize)
 * @param fn - Function to execute (rule.validate, rule.apply, etc.)
 * @param context - RuleContext for debugging
 * @returns Result of function if successful, throws InternalError on unexpected error
 *
 * @example
 * ```ts
 * // In pipeline.ts:
 * const result = withRuleErrorHandling(
 *   rule.name,
 *   "apply",
 *   () => rule.apply(context),
 *   context
 * );
 * ```
 */
export function withRuleErrorHandling<T>(
  ruleName: string,
  rulePhase: "validate" | "apply" | "finalize",
  fn: () => T,
  context: RuleContext,
): T {
  try {
    return fn();
  } catch (error) {
    // UnoErrors: Expected errors with ErrorCode, pass through
    if (isUnoError(error)) {
      throw error;
    }

    // Unexpected error: Wrap with rule context
    if (error instanceof Error) {
      logError(
        `Unexpected error in rule ${ruleName} during ${rulePhase} phase`,
        {
          ruleName,
          rulePhase,
          gameId: context.gameId,
          playerId: context.playerId,
          action: context.action.type,
          errorMessage: error.message,
          errorType: error.constructor.name,
          stack: error.stack,
        }
      );

      throw new InternalError(
        "INTERNAL_ERROR" as ErrorCode,
        `Rule execution failed: ${error.message}`,
        {
          rule: ruleName,
          phase: rulePhase,
          originalMessage: error.message,
          gameId: context.gameId,
          playerId: context.playerId,
        }
      );
    }

    // Unknown error type
    logError(
      `Unknown error type in rule ${ruleName} during ${rulePhase} phase`,
      {
        ruleName,
        rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
        error,
      }
    );

    throw new InternalError(
      "INTERNAL_ERROR" as ErrorCode,
      "An unexpected error occurred during game processing",
      {
        rule: ruleName,
        phase: rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
      }
    );
  }
}

/**
 * Async variant for finalize rules
 *
 * @example
 * ```ts
 * const result = await withRuleErrorHandlingAsync(
 *   rule.name,
 *   "finalize",
 *   () => rule.finalize(context),
 *   context
 * );
 * ```
 */
export async function withRuleErrorHandlingAsync<T>(
  ruleName: string,
  rulePhase: "finalize",
  fn: () => Promise<T>,
  context: RuleContext,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // UnoErrors: Expected errors with ErrorCode, pass through
    if (isUnoError(error)) {
      throw error;
    }

    // Unexpected error: Wrap with rule context
    if (error instanceof Error) {
      logError(
        `Unexpected error in rule ${ruleName} during ${rulePhase} phase`,
        {
          ruleName,
          rulePhase,
          gameId: context.gameId,
          playerId: context.playerId,
          action: context.action.type,
          errorMessage: error.message,
          errorType: error.constructor.name,
          stack: error.stack,
        }
      );

      throw new InternalError(
        "INTERNAL_ERROR" as ErrorCode,
        `Rule execution failed: ${error.message}`,
        {
          rule: ruleName,
          phase: rulePhase,
          originalMessage: error.message,
          gameId: context.gameId,
          playerId: context.playerId,
        }
      );
    }

    // Unknown error type
    logError(
      `Unknown error type in rule ${ruleName} during ${rulePhase} phase`,
      {
        ruleName,
        rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
        error,
      }
    );

    throw new InternalError(
      "INTERNAL_ERROR" as ErrorCode,
      "An unexpected error occurred during game processing",
      {
        rule: ruleName,
        phase: rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
      }
    );
  }
}
```

#### 2.2 Update Pipeline to Use Error Boundary

**File:** [packages/functions/src/service/rules/pipeline.ts](packages/functions/src/service/rules/pipeline.ts)

**Change:** Add error boundary wrapper around rule.validate() and rule.apply()

```typescript
// At top of file, add import:
import {
  withRuleErrorHandling,
  withRuleErrorHandlingAsync
} from "./rule-error-handling";

// In applyRulePhase(), update the validate/apply calls:
export const applyRulePhase = (
  pipeline: RulePipeline,
  phase: RulePipelinePhase,
  context: RuleContext,
): RuleResult => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"] = [];
  const shouldValidate = phase === "pre-validate" || phase === "validate";
  const shouldApply = phase === "apply";

  const executedRules: string[] = [];

  for (const rule of pipeline[phase]) {
    if (!rule.canHandle(context)) {
      continue;
    }

    executedRules.push(rule.name);

    // Validate dependencies if declared
    if (rule.dependencies) {
      validateDependencies(rule.name, rule.dependencies, context);
    }

    if (shouldValidate) {
      // NEW: Wrap with error boundary
      withRuleErrorHandling(
        rule.name,
        "validate",
        () => rule.validate?.(context),
        context
      );
    }

    if (shouldApply) {
      // NEW: Wrap with error boundary
      const result = withRuleErrorHandling(
        rule.name,
        "apply",
        () => rule.apply(context),
        context
      );

      // Validate effects have valid field names
      for (const effect of result.effects) {
        validateEffect(effect);
      }

      const taggedEffects = result.effects.map((effect) => ({
        ...effect,
        sourceRule: rule.name,
      }));

      effects.push(...taggedEffects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  // Log rule execution for debugging (only when rules execute)
  if (executedRules.length > 0) {
    console.debug(
      `[Pipeline] ${phase} phase executed: ${executedRules.join(", ")}`,
    );
  }

  return { effects, cardsDrawn };
};

// Update applyFinalizePhase with async wrapper:
export const applyFinalizePhase = async (
  pipeline: RulePipeline,
  context: RuleContext,
): Promise<RuleResult> => {
  const effects = [] as RuleResult["effects"];
  let cardsDrawn: RuleResult["cardsDrawn"] = [];
  const executedRules: string[] = [];

  for (const rule of pipeline.finalize) {
    if (!rule.canHandle(context)) {
      continue;
    }

    executedRules.push(rule.name);

    // Validate dependencies if declared
    if (rule.dependencies) {
      validateDependencies(rule.name, rule.dependencies, context);
    }

    if (rule.finalize) {
      // NEW: Wrap with async error boundary
      const result = await withRuleErrorHandlingAsync(
        rule.name,
        "finalize",
        () => rule.finalize!(context),
        context
      );

      // Validate effects have valid field names
      for (const effect of result.effects) {
        validateEffect(effect);
      }

      const taggedEffects = result.effects.map((effect) => ({
        ...effect,
        sourceRule: rule.name,
      }));

      effects.push(...taggedEffects);
      cardsDrawn = [...cardsDrawn, ...result.cardsDrawn];
    }
  }

  // Log rule execution for debugging (only when rules execute)
  if (executedRules.length > 0) {
    console.debug(
      `[Pipeline] finalize phase executed: ${executedRules.join(", ")}`,
    );
  }

  return { effects, cardsDrawn };
};
```

#### 2.3 Error Context Propagation

**Backend Log Output (Firebase Functions):**
```json
{
  "severity": "ERROR",
  "message": "Unexpected error in rule card-playable-rule during validate phase",
  "structuredData": {
    "ruleName": "card-playable-rule",
    "rulePhase": "validate",
    "gameId": "game123",
    "playerId": "player456",
    "action": "play",
    "errorMessage": "Cannot read property 'color' of undefined",
    "errorType": "TypeError",
    "stack": "..."
  }
}
```

**Frontend Receives:**
```typescript
{
  code: "INTERNAL_ERROR",
  message: "Rule execution failed: Cannot read property 'color' of undefined",
  details: {
    rule: "card-playable-rule",
    phase: "validate",
    originalMessage: "Cannot read property 'color' of undefined",
    gameId: "game123",
    playerId: "player456"
  }
}
```

**Frontend Can Log/Display:**
```typescript
const { getErrorMessage, extractErrorResponse } = useErrorHandler();

// getErrorMessage() returns:
// "An unexpected error occurred. Please try again."

// But extractErrorResponse() provides:
const response = extractErrorResponse(error);
console.log(`Failed rule: ${response?.details?.rule}`);
// → "Failed rule: card-playable-rule"

// In error reporting/telemetry:
reportError({
  code: response.code,
  rule: response.details?.rule,
  phase: response.details?.phase,
  gameId: response.details?.gameId,
});
```

---

## Integrated Implementation Plan

### Phase 1: Frontend Hook Integration (1-2 hours)

**Objective:** Enable ErrorCode → user message mapping in all frontend error paths

**Files to Change:**
1. `packages/web/src/components/notifications.tsx` - Enhanced notifyError()
2. `packages/shared/src/index.ts` - Export ERROR_MESSAGES if not already
3. `packages/web/src/hooks/useErrorHandler.ts` - Export ERROR_MESSAGES (already done)

**Testing:**
- Unit test: notifyError() extracts ErrorCode from HttpsError
- Unit test: Fallback to Firebase auth codes
- Unit test: Fallback to Error.message
- E2E test: Play invalid card → "This card cannot be played right now."
- E2E test: Not your turn → "It is not your turn. Please wait for your turn."

**Deliverables:**
- ✅ All error paths use ERROR_MESSAGES mapping
- ✅ No changes required to game-board.tsx or other components
- ✅ Backward compatible with existing notifyError() calls
- ✅ useErrorHandler() still available for advanced cases

### Phase 2: Rule Error Boundary (2-3 hours)

**Objective:** Capture rule context when unexpected errors occur during rule execution

**Files to Change:**
1. `packages/functions/src/service/rules/rule-error-handling.ts` - NEW
2. `packages/functions/src/service/rules/pipeline.ts` - Add wrappers
3. `packages/functions/src/service/rules/index.ts` - Export new util if needed

**Testing:**
- Unit test: withRuleErrorHandling() passes UnoErrors through
- Unit test: withRuleErrorHandling() wraps unexpected errors
- Unit test: Error context includes rule name and phase
- Unit test: applyRulePhase() calls wrapper correctly
- Unit test: applyFinalizePhase() calls async wrapper correctly
- E2E test: Unexpected rule error → logs include rule name

**Deliverables:**
- ✅ Rule errors always have rule context in logs
- ✅ Frontend can extract rule name from error details
- ✅ No changes to existing rule implementations
- ✅ No changes to error throwing patterns

### Phase 3: Integration & Validation (1-2 hours)

**Objective:** Verify both improvements work together end-to-end

**Tasks:**
1. Run full test suite: `bun test`
2. Lint check: `biome lint --write`
3. Build packages: `bun run build` (functions + web)
4. Manual testing:
   - Start Firebase emulators
   - Run e2e tests: `bun test e2e`
   - Test error scenarios:
     - Invalid card play
     - Wrong turn
     - Game not found
     - Rule execution error
5. Verify logs:
   - Backend logs show rule context
   - Frontend shows user-friendly messages

---

## Risk Analysis

### Risk 1: Breaking Changes to Error Messages
**Severity:** MEDIUM
**Scenario:** Changing ERROR_MESSAGES breaks frontend assumptions
**Mitigation:**
- ERROR_MESSAGES already exist and are stable
- Only adding mapping logic, not changing messages
- No new error codes introduced
- Backward compatible with current messages

### Risk 2: Rule Errors Silently Wrapped
**Severity:** LOW
**Scenario:** Rule error wrapped in InternalError, original error lost
**Mitigation:**
- Original error.message preserved in details
- Full stack trace logged to Firebase Functions logs
- InternalError includes original message in wrapped message
- Rule name explicitly captured in context

### Risk 3: Performance Impact of Try/Catch
**Severity:** LOW
**Scenario:** Try/catch in every rule adds overhead
**Mitigation:**
- Modern JS engines optimize try/catch
- Error path is exceptional (not hot path)
- Only affects error scenarios (rare)
- No impact on happy path

### Risk 4: Complex Error Details Structure
**Severity:** LOW
**Scenario:** Frontend needs to know about nested details.rule
**Mitigation:**
- Frontend already has extractErrorResponse() hook
- Details structure documented in errors.ts
- New rule field added to ErrorResponse.details
- Backward compatible (field is optional)

### Risk 5: Finalize Phase Async Handling
**Severity:** LOW
**Scenario:** Async wrapper doesn't handle all edge cases
**Mitigation:**
- Pattern follows existing finalize phase implementation
- Test coverage for async error cases
- applyFinalizePhase() already handles async
- withRuleErrorHandlingAsync() just wraps return value

---

## Execution Order Recommendation

**Option A: Frontend First** (Recommended)
1. Phase 1 (Frontend) - Low risk, visible immediate improvement
2. Phase 2 (Backend) - Depends on nothing, adds logging context
3. Phase 3 (Validation) - Test both together

**Option B: Backend First**
1. Phase 2 (Backend) - Low risk, isolated to service layer
2. Phase 1 (Frontend) - Sees improved error context from backend
3. Phase 3 (Validation) - Full integration test

**Recommended: Option A (Frontend First)**
- Frontend change has zero risk (backward compatible)
- Visible improvement immediately (developers see better messages)
- Backend change doesn't depend on frontend
- Easier to review and test independently

---

## Success Criteria

### Critical #1: Frontend Error Handler Hook Integration
- [ ] notifyError() extracts ErrorCode from HttpsError
- [ ] All game operations show user-friendly messages
- [ ] No raw backend error messages reach user
- [ ] ERROR_MESSAGES used for all error paths
- [ ] Backward compatibility maintained
- [ ] useErrorHandler() available for advanced use

### Critical #2: Rule Error Boundary
- [ ] Unexpected rule errors wrapped with rule context
- [ ] Backend logs include rule name and phase
- [ ] Frontend can extract rule details from error response
- [ ] No changes required to existing rules
- [ ] Full error context preserved (stack trace, original message)
- [ ] Async finalize errors handled correctly

### Overall
- [ ] All tests pass: `bun test`
- [ ] No lint errors: `biome lint`
- [ ] Both packages build: `bun run build`
- [ ] E2E tests pass
- [ ] No breaking changes

---

## Implementation Checklist

### Phase 1: Frontend Hook Integration
- [ ] Update notifyError() to extract ErrorCode
- [ ] Import ERROR_MESSAGES and ErrorCode in notifications.tsx
- [ ] Update parseErrorResponse() call in notifyError()
- [ ] Test notifyError() with HttpsError
- [ ] Test notifyError() with Firebase auth errors
- [ ] Test notifyError() with generic errors
- [ ] E2E test: Invalid card → user message
- [ ] E2E test: Not your turn → user message
- [ ] Run full test suite
- [ ] Run biome lint

### Phase 2: Rule Error Boundary
- [ ] Create rule-error-handling.ts
- [ ] Implement withRuleErrorHandling() sync version
- [ ] Implement withRuleErrorHandlingAsync() async version
- [ ] Update applyRulePhase() to use wrapper
- [ ] Update applyFinalizePhase() to use async wrapper
- [ ] Export utilities from rules/index.ts if needed
- [ ] Test wrappers with UnoErrors (pass through)
- [ ] Test wrappers with unexpected errors (wrap with context)
- [ ] Test error context includes rule name, phase, gameId, playerId
- [ ] Test async wrapper with async errors
- [ ] Run full test suite
- [ ] Run biome lint

### Phase 3: Integration & Validation
- [ ] Build functions package: `cd packages/functions && bun run build`
- [ ] Build web package: `cd packages/web && bun run build`
- [ ] Run full test suite: `bun test`
- [ ] Run linter: `biome lint --write`
- [ ] Manual testing with emulators
- [ ] E2E tests: `playwright test`
- [ ] Verify backend logs show rule context
- [ ] Verify frontend shows consistent messages
- [ ] Code review of changes
- [ ] Commit changes

---

## Code Examples

### Example: Error Flow with Both Improvements

**Backend (Rule Execution):**
```typescript
// rule.validate() throws unexpected error
export const applyRulePhase = (...) => {
  for (const rule of pipeline[phase]) {
    // NEW: Wrapped with error boundary
    withRuleErrorHandling(
      rule.name,
      "validate",
      () => rule.validate?.(context),
      context
    );
    // ↓ If validate() throws unexpected error:
    // Caught, logged with rule context, converted to InternalError
  }
};
```

**Frontend (Error Handler):**
```typescript
// Component tries to play card
const handlePlayCard = async (cardIndex) => {
  try {
    await playCard({ gameId, cardIndex });
  } catch (error) {
    // NEW: Enhanced notifyError() extracts ErrorCode
    notifyError(error);
    // ↓ Looks up message in ERROR_MESSAGES
    // ↓ Notification shows: "This card cannot be played right now."
  }
};
```

---

## Questions & Decisions for Review

1. **Hook Export Location**
   - Current: ERROR_MESSAGES defined in useErrorHandler.ts
   - Alternative: Move to shared/src/errors.ts as export
   - Recommendation: Keep in hook for now (already there), can move later if needed

2. **Error Details Depth**
   - Include full stack trace in details.stack?
   - Current plan: No (logged to Firebase Functions, not sent to frontend)
   - Rationale: Reduces error payload size, stack available in backend logs

3. **Rule Error Message**
   - Show original error message or generic?
   - Current plan: Generic "An unexpected error occurred" (security)
   - Original error captured in error.details for debugging

4. **Backward Compatibility**
   - notifyError() signature stays same: (err: unknown) → void
   - All existing calls continue to work
   - No refactoring required for game-board.tsx or other components

5. **Testing Strategy**
   - Unit test the wrappers, integration test the pipeline
   - E2E test verify frontend messages with emulators
   - Manual testing in dev environment

---

## Summary

This design provides:

✅ **Frontend Error Handler Integration**
- notifyError() enhanced to extract ErrorCode → user message
- Backward compatible (no component refactoring needed)
- Type-safe error handling
- useErrorHandler() available for advanced cases

✅ **Rule Error Boundary**
- Unexpected errors wrapped with rule context
- Backend logs include rule name, phase, game/player context
- Frontend can extract rule details from error response
- No changes to existing rule implementations

✅ **Production Readiness**
- Consistent user-facing error messages
- Full error context for debugging
- Error recovery information for frontend
- Complete test coverage
- Zero breaking changes

**Estimated Effort:** 5-7 hours (design → implementation → testing)
**Risk Level:** LOW
**Impact:** HIGH (improves production reliability and debuggability)
