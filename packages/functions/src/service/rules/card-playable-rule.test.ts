import { describe, expect, test } from "bun:test";
import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import type { Transaction } from "firebase-admin/firestore";
import { createCardPlayableRule } from "./card-playable-rule";
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

describe("card playable rule", () => {
  test("throws when card is not playable", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "number", color: "blue", value: 7 }],
      }),
      game: createGame({
        state: {
          ...createGame().state,
          discardPile: [{ kind: "number", color: "red", value: 4 }],
        },
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Card cannot be played");
  });

  test("does not throw when card is playable", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "number", color: "red", value: 7 }],
      }),
      game: createGame({
        state: {
          ...createGame().state,
          discardPile: [{ kind: "number", color: "red", value: 4 }],
        },
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("blocks play when mustDraw is active without stacking", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "number", color: "red", value: 7 }],
      }),
      game: createGame({
        state: {
          ...createGame().state,
          mustDraw: 2,
        },
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Card cannot be played");
  });

  test("allows draw cards when stacking is enabled", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "special", color: "red", value: "draw2" }],
      }),
      game: createGame({
        config: {
          ...createGame().config,
          houseRules: ["stacking"],
        },
        state: {
          ...createGame().state,
          mustDraw: 2,
        },
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("uses currentColor when top card is wild", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "number", color: "green", value: 3 }],
      }),
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: "green",
          discardPile: [{ kind: "wild", value: "wild" }],
        },
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("requires value match when top card is wild and no currentColor", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      playerHand: createHand({
        hand: [{ kind: "number", color: "green", value: 9 }],
      }),
      game: createGame({
        state: {
          ...createGame().state,
          currentColor: null,
          discardPile: [{ kind: "wild", value: "wild" }],
        },
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Card cannot be played");
  });

  test("throws on invalid card index", () => {
    const rule = createCardPlayableRule();
    const context = createContext({
      action: { type: "play", cardIndex: 2 },
      playerHand: createHand({
        hand: [{ kind: "number", color: "red", value: 7 }],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow("Invalid card index");
  });
});
