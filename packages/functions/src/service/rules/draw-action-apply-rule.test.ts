import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import { describe, expect, test } from "bun:test";
import type { Transaction } from "firebase-admin/firestore";
import { createDrawActionApplyRule } from "./draw-action-apply-rule";
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
  playerHands: {
    "player-1": createHand(),
    "player-2": createHand({
      hand: [{ kind: "number", color: "green", value: 5 }],
    }),
  },
  transaction: null as unknown as Transaction,
  now,
  ...overrides,
});

describe("draw-action-apply-rule", () => {
  test("draws cards and updates player hand", () => {
    const rule = createDrawActionApplyRule();
    const context = createContext();

    const result = rule.apply(context);

    expect(result.cardsDrawn.length).toBe(1);
    const handEffect = result.effects.find((e) => e.type === "update-hand");
    expect(handEffect).toBeDefined();
    if (handEffect?.type === "update-hand") {
      expect(handEffect.hand.length).toBe(2);
    }
  });

  test("penalty draw advances turn and clears mustDraw", () => {
    const rule = createDrawActionApplyRule();
    const context = createContext({
      game: createGame({
        state: {
          ...createGame().state,
          mustDraw: 2,
        },
      }),
      action: { type: "draw", count: 1 },
    });

    const result = rule.apply(context);

    const gameEffect = result.effects.find((e) => e.type === "update-game");
    expect(gameEffect).toBeDefined();
    if (gameEffect?.type === "update-game") {
      expect(gameEffect.updates["state.mustDraw"]).toBe(0);
      expect(gameEffect.updates["state.currentTurnPlayerId"]).toBe("player-2");
    }
  });
});
