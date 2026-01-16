import z from "zod";

export const UserSchema = z.object({
  uid: z.string(),
});

export type User = z.infer<typeof UserSchema>;
