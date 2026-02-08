import { describe, expect, test } from "bun:test";
import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import type { Transaction } from "firebase-admin/firestore";
import type { RuleContext } from "./types";
import { createWildColorRule } from "./wild-color-rule";

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

describe("wild color rule", () => {
  test("throws when wild has no chosen color", () => {
    const rule = createWildColorRule();
    const context = createContext({
      action: { type: "play", cardIndex: 0 },
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild" }],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow(
      "Wild card requires chosen color",
    );
  });

  test("does not throw for non-wild cards", () => {
    const rule = createWildColorRule();
    const context = createContext({
      action: { type: "play", cardIndex: 0 },
      playerHand: createHand({
        hand: [{ kind: "number", color: "blue", value: 7 }],
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("does not throw when chosen color is provided", () => {
    const rule = createWildColorRule();
    const context = createContext({
      action: { type: "play", cardIndex: 0, chosenColor: "green" },
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild" }],
      }),
    });

    expect(() => rule.validate?.(context)).not.toThrow();
  });

  test("throws for wild draw4 without chosen color", () => {
    const rule = createWildColorRule();
    const context = createContext({
      action: { type: "play", cardIndex: 0 },
      playerHand: createHand({
        hand: [{ kind: "wild", value: "wild_draw4" }],
      }),
    });

    expect(() => rule.validate?.(context)).toThrow(
      "Wild card requires chosen color",
    );
  });
});
