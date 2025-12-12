import { kdb } from './kurrent.js';
import { EventType, RecordedEvent, START } from '@kurrent/kurrentdb-client';
import { pg } from './postgres.js';

export async function getCheckpoint(name: string) {
  const res = await pg.query(
    `SELECT position FROM projection_checkpoint WHERE id = $1`,
    [name]
  );
  return res.rows.length ? res.rows[0].position : null;
}

export async function saveCheckpoint(name: string, pos: bigint) {
  await pg.query(
    `INSERT INTO projection_checkpoint (id, position, updated_at_utc)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id)
     DO UPDATE SET position = $2, updated_at_utc = NOW()`,
    [name, pos]
  );
}

export async function startProjector(
  projectionName: string,
  resourceName: string,
  handleEvent: (event: RecordedEvent<EventType>) => Promise<void>
) {
  const checkpoint = await getCheckpoint(projectionName);

  const subscription = kdb.subscribeToStream(`$ce-${resourceName}`, {
    fromRevision: checkpoint ?? START,
    resolveLinkTos: true
  });

  for await (const { event } of subscription) {
    if (!event) continue;

    console.log(`${resourceName} event received: ${event.type}, ${event.streamId}`);
    await handleEvent(event);
    await saveCheckpoint(projectionName, event.revision);
  }
}

