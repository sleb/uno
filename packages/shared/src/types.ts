import z from "zod";

export const GAME_STATUSES = {
  WAITING: "waiting",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
} as const;

export const PLAYER_STATUSES = {
  WAITING: "waiting",
  ACTIVE: "active",
  WINNER: "winner",
  FORFEITED: "forfeited",
} as const;

export const UserDataSchema = z.object({
  displayName: z.string(),
  avatar: z.string(),
});

export const UserSchema = UserDataSchema.extend({
  id: z.string(),
});

const ColorSchema = z.enum(["red", "yellow", "green", "blue"]);
const NumberCardSchema = z.object({
  kind: z.literal("number"),
  color: ColorSchema,
  value: z.number().min(0).max(9),
});
const SpecialCardSchema = z.object({
  kind: z.literal("special"),
  color: ColorSchema,
  value: z.enum(["skip", "reverse", "draw2"]),
});
const WildCardSchema = z.object({
  kind: z.literal("wild"),
  value: z.enum(["wild", "wild_draw4"]),
});

export const CardSchema = z.discriminatedUnion("kind", [
  NumberCardSchema,
  SpecialCardSchema,
  WildCardSchema,
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
    status: z.enum(Object.values(GAME_STATUSES)),
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
  status: z.enum(Object.values(PLAYER_STATUSES)),
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

export const StartGameRequestSchema = z.object({
  gameId: z.string(),
});

export type UserData = z.infer<typeof UserDataSchema>;
export type User = z.infer<typeof UserSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Color = z.infer<typeof ColorSchema>;
export type NumberCard = z.infer<typeof NumberCardSchema>;
export type SpecialCard = z.infer<typeof SpecialCardSchema>;
export type WildCard = z.infer<typeof WildCardSchema>;
export type Card = z.infer<typeof CardSchema>;
export type PlayerData = z.infer<typeof PlayerDataSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type GamePlayerData = z.infer<typeof GamePlayerDataSchema>;
export type GamePlayer = z.infer<typeof GamePlayerSchema>;
export type PlayerHandData = z.infer<typeof PlayerHandDataSchema>;
export type PlayerHand = z.infer<typeof PlayerHandSchema>;
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type CreateGameResponse = z.infer<typeof CreateGameResponseSchema>;
export type StartGameRequest = z.infer<typeof StartGameRequestSchema>;
export type HouseRule = z.infer<typeof HouseRuleSchema>;
