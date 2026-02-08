import { describe, expect, test } from "bun:test";
import type { GameData, GamePlayerData, PlayerHandData } from "@uno/shared";
import { GAME_STATUSES } from "@uno/shared";
import type { Transaction } from "firebase-admin/firestore";
import { createPassActionApplyRule } from "./pass-action-apply-rule";
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
    turnsPlayed: 3,
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
  action: { type: "pass" },
  game: createGame(),
  player: createPlayer(),
  playerHand: createHand(),
  playerHands: {},
  transaction: null as unknown as Transaction,
  now,
  ...overrides,
});

describe("pass-action-apply-rule", () => {
  test("advances turn and increments turnsPlayed", () => {
    const rule = createPassActionApplyRule();
    const context = createContext();

    const result = rule.apply(context);

    const gameEffect = result.effects.find((e) => e.type === "update-game");
    expect(gameEffect).toBeDefined();
    if (gameEffect?.type === "update-game") {
      expect(gameEffect.updates["state.currentTurnPlayerId"]).toBe("player-2");
    }

    const playerEffect = result.effects.find((e) => e.type === "update-player");
    expect(playerEffect).toBeDefined();
    if (playerEffect?.type === "update-player") {
      expect(playerEffect.updates["gameStats.turnsPlayed"]).toBe(4);
    }
  });
});
