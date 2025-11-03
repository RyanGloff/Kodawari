import { z } from "zod";
import { KnownEvent } from "../events/types.js";
import { applyUserEvent } from "./user.handlers.js";
import type { PoolClient } from "pg";

export type Handler = (e: z.infer<typeof KnownEvent>, client: PoolClient) => Promise<void>;

export const dispatch: Handler = async (e, client) => {
  // route by event type / stream prefix as needed
  await applyUserEvent(e, client);
};

