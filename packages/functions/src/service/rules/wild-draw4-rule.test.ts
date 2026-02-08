import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import type { RuleContext } from "./types";
import { createWildDraw4Rule } from "./wild-draw4-rule";

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

describe("wild draw4 rule", () => {
  test("allows wild draw4 to be played anytime", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild_draw4" }],
      }),
    });

    // Should not throw - wild draw4 can be played anytime
    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("canHandle returns true for wild draw4 cards", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      action: { type: "play", cardIndex: 0 },
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild_draw4" }],
      }),
    });

    expect(rule.canHandle(context)).toBe(true);
  });

  test("allows wild draw4 even when player has matching color", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: "red",
          discardPile: [{ kind: "number", color: "red", value: 9 }],
          mustDraw: 0,
        },
      }),
      playerHand: createHand({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "red", value: 2 },
        ],
      }),
    });

    // Should not throw - wild draw4 can be played even with matching color
    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("throws for invalid card index", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      action: { type: "play", cardIndex: 999 },
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild_draw4" }],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Invalid card index");
  });

  test("does not handle non-wild card types", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      action: { type: "play", cardIndex: 0 },
      playerHand: createHand({
        hand: [{ kind: "number", color: "red", value: 5 }],
      }),
    });

    // canHandle should return false for non-wild cards
    expect(rule.canHandle(context)).toBe(false);
  });
});
