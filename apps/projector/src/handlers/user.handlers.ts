import { PoolClient } from "pg";
import type { KnownEvent } from "../events/types.js";

export async function applyUserEvent(e: KnownEvent, client: PoolClient) {
  switch (e.type) {
    case "UserCreated": {
      const d = e.data;
      await client.query(
        `INSERT INTO user_read_model (user_id, username, email, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,true,$4,$4)
         ON CONFLICT (user_id) DO NOTHING`,
        [d.userId, d.username, d.email, d.createdAt]
      );
      return;
    }
    case "UserEmailUpdated": {
      const d = e.data;
      await client.query(
        `UPDATE user_read_model
         SET email = $2, updated_at = $3
         WHERE user_id = $1`,
        [d.userId, d.email, d.updatedAt]
      );
      return;
    }
    case "UserDeactivated": {
      const d = e.data;
      await client.query(
        `UPDATE user_read_model
         SET is_active = false, updated_at = $2
         WHERE user_id = $1`,
        [d.userId, d.updatedAt]
      );
      return;
    }
  }
}

