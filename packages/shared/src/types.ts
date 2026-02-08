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

// User Statistics Schema - tracks career stats
export const UserStatsSchema = z.object({
  gamesPlayed: z.number().default(0),
  gamesWon: z.number().default(0),
  gamesLost: z.number().default(0),
  totalScore: z.number().default(0),
  highestGameScore: z.number().default(0),
  winRate: z.number().default(0),
  cardsPlayed: z.number().default(0),
  specialCardsPlayed: z.number().default(0),
});

// Player Score in final results
export const PlayerScoreSchema = z.object({
  playerId: z.string(),
  displayName: z.string(),
  score: z.number(),
  cardCount: z.number(),
  rank: z.number(),
});

// Game Final Scores - calculated when game completes
export const GameFinalScoresSchema = z.object({
  winnerId: z.string(),
  winnerScore: z.number(),
  completedAt: z.string(), // ISO datetime
  playerScores: z.array(PlayerScoreSchema),
});

export const UserDataSchema = z.object({
  displayName: z.string(),
  avatar: z.string(),
  stats: UserStatsSchema.optional(),
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

export const HouseRuleSchema = z.enum(["stacking", "drawToMatch"]);

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
    currentColor: ColorSchema.nullable().default(null),
    mustDraw: z.number().min(0).default(0),
  }),
  finalScores: GameFinalScoresSchema.optional(),
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
  mustCallUno: z.boolean().default(false),
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

export const PlayCardRequestSchema = z.object({
  gameId: z.string(),
  cardIndex: z.number().int().min(0),
  chosenColor: ColorSchema.optional(),
});

export const PlayCardResponseSchema = z.object({
  winner: z.string().optional(),
});

export const DrawCardRequestSchema = z.object({
  gameId: z.string(),
  count: z.number().int().min(1).max(10).default(1),
});

export const DrawCardResponseSchema = z.object({
  cards: z.array(CardSchema),
});

export const PassTurnRequestSchema = z.object({
  gameId: z.string(),
});

export const CallUnoRequestSchema = z.object({
  gameId: z.string(),
});

export const CallUnoResponseSchema = z.object({
  caughtPlayerId: z.string().optional(),
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
export type PlayCardRequest = z.infer<typeof PlayCardRequestSchema>;
export type PlayCardResponse = z.infer<typeof PlayCardResponseSchema>;
export type DrawCardRequest = z.infer<typeof DrawCardRequestSchema>;
export type DrawCardResponse = z.infer<typeof DrawCardResponseSchema>;
export type PassTurnRequest = z.infer<typeof PassTurnRequestSchema>;
export type CallUnoRequest = z.infer<typeof CallUnoRequestSchema>;
export type CallUnoResponse = z.infer<typeof CallUnoResponseSchema>;
export type HouseRule = z.infer<typeof HouseRuleSchema>;
export type UserStats = z.infer<typeof UserStatsSchema>;
export type PlayerScore = z.infer<typeof PlayerScoreSchema>;
export type GameFinalScores = z.infer<typeof GameFinalScoresSchema>;
