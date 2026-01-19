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

export const GameDataSchema = z.object({
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable().default(null),
  lastActivityAt: z.iso.datetime(),
  config: z.object({
    isPrivate: z.boolean().default(false),
    maxPlayers: z.number().min(2).max(10).default(4),
    houseRules: z
      .set(
        z.enum([
          "Stacking",
          "JumpIn",
          "SevenSwap",
          "DrawToMatch",
          "ZeroRotate",
        ]),
      )
      .default(new Set()),
  }),
  players: z.array(z.string()).default([]),
  state: z.object({
    status: z.enum(["waiting", "in-progress", "completed"]),
    currentTurnPlayerId: z.string().nullable().default(null),
    direction: z.enum(["clockwise", "counter-clockwise"]),
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

export type UserData = z.infer<typeof UserDataSchema>;
export type User = z.infer<typeof UserSchema>;
export type GameData = z.infer<typeof GameDataSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Card = z.infer<typeof CardSchema>;
export type PlayerData = z.infer<typeof PlayerDataSchema>;
export type Player = z.infer<typeof PlayerSchema>;
