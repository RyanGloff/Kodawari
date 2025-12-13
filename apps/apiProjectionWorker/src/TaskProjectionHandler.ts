import {
  EventType,
  RecordedEvent,
} from "@kurrent/kurrentdb-client/dist/index.js";
import { pg } from "./postgres.js";
import {
    KurrentDBTagAttachedToTag,
  KurrentDBTagAttachedToTask,
  KurrentDBTagDetachedFromTask,
  KurrentDBTaskCompleted,
  KurrentDBTaskCreated,
  KurrentDBTaskUpdated,
  TagAttachedToTaskEvent,
  TagDetachedFromTaskEvent,
  TaskCompletedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskReopenedEvent,
  TaskUpdatedEvent,
} from "@model/TaskResource.js";
import { startProjector } from "./ProjectionHandlerUtil.js";

const PROJECTION_NAME = "TASK_API_PROJECTION";

async function handleTaskEvent(event: RecordedEvent<EventType>) {
  const client = await pg.connect();

  try {
    await client.query("BEGIN");

    switch (event.type) {
      case TaskCreatedEvent:
        const taskCreatedEvent = event.data as KurrentDBTaskCreated;
        await client.query(
          `INSERT INTO tasks (id, name, revision, deleted_at, created_at, updated_at, deadline)
           VALUES ($1, $2, $3, NULL, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            event.streamId,
            taskCreatedEvent.name,
            event.revision,
            event.created,
            event.created,
            taskCreatedEvent.deadline,
          ],
        );
        break;

      case TaskUpdatedEvent:
        const taskUpdatedEvent = event.data as KurrentDBTaskUpdated;
        await client.query(
          `UPDATE tasks
             SET name = $1, revision = $2, updated_at = $3, deadline: $4
           WHERE id = $5`,
          [
            taskUpdatedEvent.name,
            event.revision,
            event.created,
            taskUpdatedEvent.deadline,
            event.streamId,
          ],
        );
        break;

      case TaskCompletedEvent:
        const taskCompletedEvent = event.data as KurrentDBTaskCompleted;
        await client.query(
          `UPDATE tasks
             SET completed_at = $1, revision= $2, updated_at = $3
           WHERE id = $4`,
          [
            taskCompletedEvent.completedAt,
            event.revision,
            event.created,
            event.streamId,
          ],
        );
        break;

      case TaskReopenedEvent:
        await client.query(
          `UPDATE tasks
             SET completed_at = null, revision = $1, updated_at = $2
           WHERE id = $3`,
          [event.revision, event.created, event.streamId],
        );
        break;

      case TagAttachedToTaskEvent:
        const tagAttachedToTaskEvent = event.data as KurrentDBTagAttachedToTask;
        await client.query(
          `INSERT INTO task_tag(task_id, tag_id) VALUES ($1, $2)`,
          [event.streamId, tagAttachedToTaskEvent.tagId]
        );
        await client.query(
          `UPDATE tasks SET revision = $1 WHERE id = $2;`,
          [event.revision, event.streamId]
        );
        break;

      case TagDetachedFromTaskEvent:
        const tagDetachedFromTaskEvent = event.data as KurrentDBTagDetachedFromTask;
        await client.query(`DELETE FROM task_tag WHERE tag_id = $1 AND task_id = $2`,
          [event.streamId, tagDetachedFromTaskEvent.tagId]
        );
        await client.query(
          `UPDATE tasks SET revision = $1 WHERE id = $2;`,
          [event.revision, event.streamId]
        );
        break;

      case TaskDeletedEvent:
        await client.query(
          `UPDATE tasks
             SET deleted_at = $1, revision = $2, updated_at = $3
           WHERE id = $4`,
          [event.created, event.revision, event.created, event.streamId],
        );
        await client.query(`DELETE FROM task_tag WHERE task_id = $1`, [event.streamId]);
        break;

      default:
        console.error(`Unknown event type: ${event.type}`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Projection error:", err);
    // Rethrow to stop processing events until the support is added for the unknown event
    // May decide on a better solution in the future
    throw err;
  } finally {
    client.release();
  }
}

export const initTaskProjector = () => startProjector(PROJECTION_NAME, "Task", handleTaskEvent);
