import { EventType, RecordedEvent, START } from "@kurrent/kurrentdb-client/dist/index.js";
import { kdb } from "./kurrent.js";
import { Pool } from "pg";

const pgHost = process.env.PG_HOST;
const pgDatabase = process.env.PG_DATABASE
const pgUsername = process.env.PG_USERNAME;
const pgPassword = process.env.PG_PASSWORD;
const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

const pg = new Pool({ connectionString });
const PROJECTION_NAME = 'TASK_API_PROJECTION';

async function getCheckpoint(name: string) {
  const res = await pg.query(
    `SELECT position FROM projection_checkpoint WHERE id = $1`,
    [name]
  );
  return res.rows.length ? res.rows[0].position : null;
}

async function saveCheckpoint(name: string, pos: bigint) {
  await pg.query(
    `INSERT INTO projection_checkpoint (id, position, updated_at_utc)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id)
     DO UPDATE SET position = $2, updated_at_utc = NOW()`,
    [name, pos]
  );
}

async function startProjector() {
  const checkpoint = await getCheckpoint(PROJECTION_NAME);

  const subscription = kdb.subscribeToStream("$ce-Task", {
    fromRevision: checkpoint ?? START,
    resolveLinkTos: true
  });

  for await (const { event } of subscription) {
    if (!event) continue;

    await handleEvent(event);

    // Save our position AFTER successful processing
    await saveCheckpoint(PROJECTION_NAME, event.revision);
  }
}

type TaskCreated = {
  name: string;
  deadline?: Date;
};
type TaskUpdated = {
  name: string;
  deadline?: Date;
};

async function handleEvent(event: RecordedEvent<EventType>) {
  const client = await pg.connect();

  try {
    console.log(`Event received: ${event.type}, ${event.streamId}`);
    await client.query("BEGIN");

    switch (event.type) {
      case "TaskCreated":
        const taskCreatedEvent = event.data as TaskCreated;
        await client.query(
          `INSERT INTO tasks (id, name, revision, deleted, created_at, updated_at, deadline)
           VALUES ($1, $2, $3, false, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [event.streamId, taskCreatedEvent.name, event.revision, event.created, event.created, taskCreatedEvent.deadline]
        );
        break;

      case "TaskUpdated":
        const taskUpdatedEvent = event.data as TaskUpdated;
        await client.query(
          `UPDATE tasks
             SET name = $1, revision = $2, updated_at = $3, deadline: $4
           WHERE id = $5`,
          [taskUpdatedEvent.name, event.revision, event.created, taskUpdatedEvent.deadline, event.streamId]
        );
        break;

      case "TaskDeleted":
        await client.query(
          `UPDATE tasks
             SET deleted = true, revision = $1, updated_at = $2
           WHERE id = $3`,
          [event.revision, event.created, event.streamId]
        );
        break;
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Projection error:", err);
  } finally {
    client.release();
  }
}

startProjector();
