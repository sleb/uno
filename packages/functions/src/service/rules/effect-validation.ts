import {
  CardSchema,
  GameDataSchema,
  GamePlayerDataSchema,
  PlayerHandDataSchema,
  UserDataSchema,
} from "@uno/shared";
import { z } from "zod";
import type {
  EmitEventsEffect,
  SetWinnerEffect,
  UpdateGameEffect,
  UpdateHandEffect,
  UpdatePlayerEffect,
} from "./types";

/**
 * Zod schemas for validating effect updates against known data structures
 * Helps catch misconfigurations where rules try to update non-existent fields
 */

// Game state fields that can be updated
const GameStateFields = z.enum([
  "status",
  "currentTurnPlayerId",
  "direction",
  "mustDraw",
  "currentColor",
  "discardPile",
  "deckSeed",
  "drawPileCount",
]);

// Game config fields that can be updated
const GameConfigFields = z.enum(["isPrivate", "houseRules", "maxPlayers"]);

// Top-level Game fields that can be updated
const GameFieldSchema = z.union([
  z
    .string()
    .startsWith("state.")
    .pipe(
      z.string().transform((v) => {
        const field = v.substring(6);
        return GameStateFields.parse(field);
      }),
    ),
  z
    .string()
    .startsWith("config.")
    .pipe(
      z.string().transform((v) => {
        const field = v.substring(7);
        return GameConfigFields.parse(field);
      }),
    ),
  z.enum(["lastActivityAt", "startedAt", "createdAt", "finalScores"]),
]);

// Player fields that can be updated
const PlayerFieldSchema = z.enum([
  "cardCount",
  "status",
  "hasCalledUno",
  "mustCallUno",
  "lastActionAt",
  "gameStats.cardsPlayed",
  "gameStats.turnsPlayed",
  "gameStats.specialCardsPlayed",
  "gameStats.cardsDrawn",
]);

const isStrictValidation = (): boolean => {
  return (
    process.env.UNO_STRICT_RULE_VALIDATION === "true" ||
    process.env.NODE_ENV === "test"
  );
};

const reportValidationIssue = (message: string): void => {
  if (isStrictValidation()) {
    throw new Error(message);
  }
  console.warn(message);
};

/**
 * Validates that an update-game effect has valid field names
 * Logs warnings for any unknown fields (allows last-write-wins but warns)
 */
export const validateGameEffect = (effect: UpdateGameEffect): void => {
  for (const key of Object.keys(effect.updates)) {
    try {
      GameFieldSchema.parse(key);
    } catch (_e) {
      reportValidationIssue(
        `[Rule Validation] Unknown game field: "${key}" - may not exist in GameData`,
      );
    }
  }
};

/**
 * Validates that an update-player effect has valid field names
 * Logs warnings for any unknown fields
 */
export const validatePlayerEffect = (effect: UpdatePlayerEffect): void => {
  for (const key of Object.keys(effect.updates)) {
    try {
      PlayerFieldSchema.parse(key);
    } catch (_e) {
      reportValidationIssue(
        `[Rule Validation] Unknown player field: "${key}" - may not exist in GamePlayerData`,
      );
    }
  }
};

const HandSchema = z.array(CardSchema);

export const validateHandEffect = (effect: UpdateHandEffect): void => {
  const result = HandSchema.safeParse(effect.hand);
  if (!result.success) {
    reportValidationIssue(
      `[Rule Validation] Invalid hand update for ${effect.playerId}: ${result.error.message}`,
    );
  }
};

const SetWinnerEffectSchema = z
  .object({
    winnerId: z.string(),
    preFetchedData: z.object({
      game: GameDataSchema,
      playerHands: z.record(PlayerHandDataSchema),
      gamePlayers: z.record(GamePlayerDataSchema),
      userDataMap: z.record(UserDataSchema),
    }),
  })
  .passthrough();

export const validateSetWinnerEffect = (effect: SetWinnerEffect): void => {
  const result = SetWinnerEffectSchema.safeParse(effect);
  if (!result.success) {
    reportValidationIssue(
      `[Rule Validation] Invalid set-winner effect: ${result.error.message}`,
    );
  }
};

const PlainObjectSchema = z
  .record(z.unknown())
  .refine((value) => !Array.isArray(value), {
    message: "Payload must be an object",
  });

const EmitEventSchema = z.object({
  type: z.string(),
  payload: PlainObjectSchema.optional(),
});

export const validateEmitEventsEffect = (effect: EmitEventsEffect): void => {
  const result = z.array(EmitEventSchema).safeParse(effect.events);
  if (!result.success) {
    reportValidationIssue(
      `[Rule Validation] Invalid emit-events effect: ${result.error.message}`,
    );
  }
};

/**
 * Validates all field references in an effect
 * Used during effect processing to catch configuration errors
 */
export const validateEffect = (effect: any): void => {
  if (effect.type === "update-game") {
    validateGameEffect(effect);
  } else if (effect.type === "update-player") {
    validatePlayerEffect(effect);
  } else if (effect.type === "update-hand") {
    validateHandEffect(effect);
  } else if (effect.type === "set-winner") {
    validateSetWinnerEffect(effect);
  } else if (effect.type === "emit-events") {
    validateEmitEventsEffect(effect);
  }
};
