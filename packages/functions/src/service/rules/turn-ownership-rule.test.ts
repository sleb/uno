import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import { createTurnOwnershipRule } from "./turn-ownership-rule";
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
  cardCount: 0,
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
  hand: [],
  ...overrides,
});

const createContext = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  gameId: "game-1",
  playerId: "player-1",
  action: { type: "play", cardIndex: 0 },
  game: createGame(),
  player: createPlayer(),
  playerHand: createHand(),
  playerHands: {},
  transaction: null as unknown as Transaction,
  now,
  ...overrides,
});

describe("turn ownership rule", () => {
  test("handles play action", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({ action: { type: "play", cardIndex: 0 } });

    expect(rule.canHandle(context)).toBe(true);
  });

  test("handles draw action", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({ action: { type: "draw", count: 1 } });

    expect(rule.canHandle(context)).toBe(true);
  });

  test("handles pass action", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({ action: { type: "pass" } });

    expect(rule.canHandle(context)).toBe(true);
  });

  test("throws when game is not in progress", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          status: GAME_STATUSES.WAITING,
        },
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Game is not in progress");
  });

  test("throws when player is not in game", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({
      playerId: "player-3",
    });

    expect(() => rule.validate?.(context)).toThrow(
      "Player player-3 is not in game game-1",
    );
  });

  test("throws when not player's turn", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({
      playerId: "player-2",
    });

    expect(() => rule.validate?.(context)).toThrow("Not your turn");
  });

  test("does not throw when player owns turn and game is in progress", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({
      playerId: "player-1",
      game: createGame({
        state: {
          ...createGame().state,
          currentTurnPlayerId: "player-1",
        },
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("throws when game is completed", () => {
    const rule = createTurnOwnershipRule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          status: GAME_STATUSES.COMPLETED,
        },
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Game is not in progress");
  });
});
