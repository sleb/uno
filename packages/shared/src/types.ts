import z from "zod";

export const UserDataSchema = z.object({
  displayName: z.string(),
  avatar: z.string(),
});

export const UserSchema = UserDataSchema.extend({
  id: z.string(),
});

export const CardSchema = z.discriminatedUnion("value", [
  z.object({
    color: z.enum(["red", "yellow", "green", "blue"]),
    value: z.enum([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "skip",
      "reverse",
      "draw-two",
    ]),
  }),
  z.object({
    value: z.enum(["wild", "wild-draw-four"]),
  }),
]);

export const HouseRuleSchema = z.enum([
  "stacking",
  "jumpIn",
  "sevenSwap",
  "drawToMatch",
  "zeroRotation",
]);

export const GameDataSchema = z.object({
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable().default(null),
  lastActivityAt: z.iso.datetime(),
  config: z.object({
    isPrivate: z.boolean().default(false),
    maxPlayers: z.number().min(2).max(10).default(4),
    houseRules: z.array(HouseRuleSchema),
  }),
  players: z.array(z.string()).default([]),
  state: z.object({
    status: z.enum(["waiting", "in-progress", "completed"]),
    currentTurnPlayerId: z.string().nullable().default(null),
    direction: z.enum(["clockwise", "counter-clockwise"]),
    deckSeed: z.string(),
    drawPileCount: z.number(),
    discardPile: z.array(CardSchema),
  }),
});

export const PlayerDataSchema = z.object({
  profile: UserDataSchema,
  hand: z.array(CardSchema),
});

export const PlayerSchema = PlayerDataSchema.extend({
  id: z.string(),
});

export const GameSchema = GameDataSchema.extend({
  id: z.string(),
});

// Game Players Subcollection - Public profile data (readable by all players in game)
export const GamePlayerDataSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatar: z.string(),
  joinedAt: z.iso.datetime(),
  cardCount: z.number(),
  hasCalledUno: z.boolean(),
  status: z.enum(["waiting", "active", "winner", "forfeited"]),
  lastActionAt: z.iso.datetime(),
  gameStats: z.object({
    cardsPlayed: z.number(),
    cardsDrawn: z.number(),
    turnsPlayed: z.number(),
    specialCardsPlayed: z.number(),
  }),
});

export const GamePlayerSchema = GamePlayerDataSchema.extend({
  id: z.string(),
});

// Player Hands Subcollection - Private hand data (readable only by owner)
export const PlayerHandDataSchema = z.object({
  hand: z.array(CardSchema),
});

export const PlayerHandSchema = PlayerHandDataSchema.extend({
  id: z.string(),
});

export const CreateGameRequestSchema = z.object({
  isPrivate: z.boolean(),
  maxPlayers: z.number().min(2).max(4),
  houseRules: z.array(HouseRuleSchema),
});

export const CreateGameResponseSchema = z.object({
  gameId: z.string(),
});

export type UserData = z.infer<typeof UserDataSchema>;
export type User = z.infer<typeof UserSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Card = z.infer<typeof CardSchema>;
export type PlayerData = z.infer<typeof PlayerDataSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type GamePlayerData = z.infer<typeof GamePlayerDataSchema>;
export type GamePlayer = z.infer<typeof GamePlayerSchema>;
export type PlayerHandData = z.infer<typeof PlayerHandDataSchema>;
export type PlayerHand = z.infer<typeof PlayerHandSchema>;
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type CreateGameResponse = z.infer<typeof CreateGameResponseSchema>;
export type HouseRule = z.infer<typeof HouseRuleSchema>;
