import { ErrorCode, InternalError, isUnoError } from "@uno/shared";
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
  rulePhase: "validate" | "apply",
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
        },
      );

      throw new InternalError(
        ErrorCode.INTERNAL_ERROR,
        `Rule execution failed: ${error.message}`,
        {
          rule: ruleName,
          phase: rulePhase,
          originalMessage: error.message,
          gameId: context.gameId,
          playerId: context.playerId,
          timestamp: new Date().toISOString(),
        },
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
      },
    );

    throw new InternalError(
      ErrorCode.INTERNAL_ERROR,
      "An unexpected error occurred during game processing",
      {
        rule: ruleName,
        phase: rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
        timestamp: new Date().toISOString(),
      },
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
        },
      );

      throw new InternalError(
        ErrorCode.INTERNAL_ERROR,
        `Rule execution failed: ${error.message}`,
        {
          rule: ruleName,
          phase: rulePhase,
          originalMessage: error.message,
          gameId: context.gameId,
          playerId: context.playerId,
          timestamp: new Date().toISOString(),
        },
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
      },
    );

    throw new InternalError(
      ErrorCode.INTERNAL_ERROR,
      "An unexpected error occurred during game processing",
      {
        rule: ruleName,
        phase: rulePhase,
        gameId: context.gameId,
        playerId: context.playerId,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
