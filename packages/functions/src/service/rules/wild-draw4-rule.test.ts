import { describe, expect, test } from "bun:test";
import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
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
  test("throws when player has matching color", () => {
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

    expect(() => rule.validate?.(context)).toThrow(
      "Wild Draw Four can only be played when you have no matching color",
    );
  });

  test("does not throw when no matching color", () => {
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
          { kind: "number", color: "blue", value: 2 },
        ],
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("uses top-card color when currentColor is null", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: null,
          discardPile: [{ kind: "number", color: "yellow", value: 5 }],
          mustDraw: 0,
        },
      }),
      playerHand: createHand({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "yellow", value: 1 },
        ],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow(
      "Wild Draw Four can only be played when you have no matching color",
    );
  });

  test("uses currentColor when top card is wild", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: "green",
          discardPile: [{ kind: "wild", value: "wild" }],
          mustDraw: 0,
        },
      }),
      playerHand: createHand({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "green", value: 7 },
        ],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow(
      "Wild Draw Four can only be played when you have no matching color",
    );
  });

  test("does not throw when mustDraw is active", () => {
    const rule = createWildDraw4Rule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: "red",
          discardPile: [{ kind: "number", color: "red", value: 9 }],
          mustDraw: 2,
        },
      }),
      playerHand: createHand({
        hand: [
          { kind: "wild", value: "wild_draw4" },
          { kind: "number", color: "red", value: 2 },
        ],
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });
});
