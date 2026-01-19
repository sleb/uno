import z from "zod";

export const UserDataSchema = z.object({
  displayName: z.string(),
  avatar: z.string(),
});

export const UserSchema = UserDataSchema.extend({
  id: z.string(),
});

export type UserData = z.infer<typeof UserDataSchema>;
export type User = z.infer<typeof UserSchema>;
