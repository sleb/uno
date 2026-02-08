import { z } from "zod";
import type { UpdateGameEffect, UpdatePlayerEffect } from "./types";

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

/**
 * Validates that an update-game effect has valid field names
 * Logs warnings for any unknown fields (allows last-write-wins but warns)
 */
export const validateGameEffect = (effect: UpdateGameEffect): void => {
  for (const key of Object.keys(effect.updates)) {
    try {
      GameFieldSchema.parse(key);
    } catch (_e) {
      console.warn(
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
      console.warn(
        `[Rule Validation] Unknown player field: "${key}" - may not exist in GamePlayerData`,
      );
    }
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
  }
};
