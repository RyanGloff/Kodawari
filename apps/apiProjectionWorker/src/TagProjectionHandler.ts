import {
  EventType,
  RecordedEvent,
} from "@kurrent/kurrentdb-client/dist/index.js";
import { pg } from "./postgres.js";
import {
  KurrentDBTagCreated,
  KurrentDBTagUpdated,
  TagCreatedEvent,
  TagDeletedEvent,
  TagUpdatedEvent,
} from "@model/TagResource.js";
import { startProjector } from "./ProjectionHandlerUtil.js";

const PROJECTION_NAME = "TAG_API_PROJECTION";

async function handleTagEvent(event: RecordedEvent<EventType>) {
  const client = await pg.connect();

  try {
    await client.query("BEGIN");

    switch (event.type) {
      case TagCreatedEvent:
        const tagCreatedEvent = event.data as KurrentDBTagCreated;
        await client.query(
          `INSERT INTO tags (id, name, deleted_at, created_at, updated_at, revision)
           VALUES ($1, $2, NULL, $3, $4, 0)`,
          [
            event.streamId,
            tagCreatedEvent.name,
            event.created,
            event.created,
          ],
        );
        break;

      case TagUpdatedEvent:
        const tagUpdatedEvent = event.data as KurrentDBTagUpdated;
        await client.query(
          `UPDATE tags
             SET name = $1, revision = $2, updated_at = $3
           WHERE id = $4`,
          [
            tagUpdatedEvent.name,
            event.revision,
            event.created,
            event.streamId,
          ],
        );
        break;

      case TagDeletedEvent:
        await client.query(
          `UPDATE tags
             SET deleted_at = $1, revision = $2, updated_at = $3
           WHERE id = $4`,
          [event.created, event.revision, event.created, event.streamId],
        );
        break;

      default:
        console.error(`Unknown event type: ${event.type}`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Projection error:", err);
  } finally {
    client.release();
  }
}
export const initTagProjector = () => startProjector(PROJECTION_NAME, "Tag", handleTagEvent);
