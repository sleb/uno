import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import { createDrawActionValidateRule } from "./draw-action-validate-rule";
import type { RuleContext } from "./types";

const now = new Date().toISOString();

const createGame = (overrides: Partial<GameData> = {}): GameData => ({
  createdAt: now,
  startedAt: now,
  lastActivityAt: now,
  config: {
    isPrivate: false,
    maxPlayers: 4,
    houseRules: [],
  },
  players: ["player-1", "player-2"],
  state: {
    status: GAME_STATUSES.IN_PROGRESS,
    currentTurnPlayerId: "player-1",
    direction: "clockwise",
    deckSeed: "seed",
    drawPileCount: 100,
    discardPile: [{ kind: "number", color: "red", value: 4 }],
    currentColor: null,
    mustDraw: 0,
  },
  ...overrides,
});

const createPlayer = (
  overrides: Partial<GamePlayerData> = {},
): GamePlayerData => ({
  userId: "player-1",
  displayName: "Player One",
  avatar: "avatar",
  joinedAt: now,
  cardCount: 1,
  hasCalledUno: false,
  mustCallUno: false,
  status: "active",
  lastActionAt: now,
  gameStats: {
    cardsPlayed: 0,
    cardsDrawn: 0,
    turnsPlayed: 0,
    specialCardsPlayed: 0,
  },
  ...overrides,
});

const createHand = (
  overrides: Partial<PlayerHandData> = {},
): PlayerHandData => ({
  hand: [{ kind: "number", color: "blue", value: 7 }],
  ...overrides,
});

const createContext = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  gameId: "game-1",
  playerId: "player-1",
  action: { type: "draw", count: 1 },
  game: createGame(),
  player: createPlayer(),
  playerHand: createHand(),
  playerHands: {},
  transaction: null as unknown as Transaction,
  now,
  ...overrides,
});

describe("draw-action-validate-rule", () => {
  test("rejects draw counts less than 1", () => {
    const rule = createDrawActionValidateRule();
    const context = createContext({ action: { type: "draw", count: 0 } });

    expect(() => rule.validate?.(context)).toThrow(
      "Draw count must be at least 1",
    );
  });

  test("accepts positive draw count", () => {
    const rule = createDrawActionValidateRule();
    const context = createContext({ action: { type: "draw", count: 2 } });

    expect(() => rule.validate?.(context)).not.toThrow();
  });
});
