import { z } from "zod";

export const baseEvent = z.object({
  eventId: z.string().uuid(),
  type: z.string(),
  ts: z.string().datetime(), // ISO-8601
  meta: z.object({
    stream: z.string().optional(),
    correlationId: z.string().optional(),
  }).optional()
});

export const UserCreated = baseEvent.extend({
  type: z.literal("UserCreated"),
  data: z.object({
    userId: z.string(),
    username: z.string().min(1),
    email: z.string().email(),
    createdAt: z.string().datetime()
  })
});

export const UserEmailUpdated = baseEvent.extend({
  type: z.literal("UserEmailUpdated"),
  data: z.object({
    userId: z.string(),
    email: z.string().email(),
    updatedAt: z.string().datetime()
  })
});

export const UserDeactivated = baseEvent.extend({
  type: z.literal("UserDeactivated"),
  data: z.object({
    userId: z.string(),
    updatedAt: z.string().datetime()
  })
});

export const KnownEvent = z.discriminatedUnion("type", [
  UserCreated,
  UserEmailUpdated,
  UserDeactivated
]);

export type KnownEvent = z.infer<typeof KnownEvent>;

