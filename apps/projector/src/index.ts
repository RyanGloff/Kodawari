import { runConsumer } from "./infra/kafka.js";
import { withTx, pool } from "./infra/db.js";
import { config } from "./config.js";
import { KnownEvent } from "./events/types.js";
import type { EachBatchPayload } from "kafkajs";

/**
 * Store/advance checkpoint inside the same DB tx as projections (exactly-once effect)
 */
async function getOffset(client: any, topic: string, partition: number): Promise<bigint | null> {
  const { rows } = await client.query(
    "SELECT offset FROM projection_offsets WHERE topic=$1 AND partition=$2",
    [topic, partition]
  );
  if (rows.length === 0) return null;
  return BigInt(rows[0].offset);
}

async function setOffset(client: any, topic: string, partition: number, offset: bigint) {
  await client.query(
    `INSERT INTO projection_offsets (topic, partition, offset)
     VALUES ($1,$2,$3)
     ON CONFLICT (topic, partition) DO UPDATE SET offset = EXCLUDED.offset`,
    [topic, partition, offset.toString()]
  );
}

async function handleBatch({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, isRunning, isStale }: EachBatchPayload) {
  if (!isRunning() || isStale()) return;

  // Process per-partition to preserve order & idempotency
  const { topic, partition } = batch;
  await withTx(async (client) => {
    const lastProcessed = await getOffset(client, topic, partition);

    let processedUpTo: bigint | null = null;
    let count = 0;

    for (const message of batch.messages) {
      const currentOffset = BigInt(message.offset);

      // Skip already processed offsets
      if (lastProcessed !== null && currentOffset <= lastProcessed) {
        resolveOffset(message.offset);
        continue;
      }

      if (!message.value) continue;
      const raw = message.value.toString("utf-8");

      // Parse and validate
      const parsed = KnownEvent.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        // Optionally log dead-letter
        console.error("Invalid event", parsed.error.flatten(), { topic, partition, offset: message.offset });
        resolveOffset(message.offset);
        continue;
      }

      // Apply projection(s)
      await (await import("./handlers/index.js")).dispatch(parsed.data, client);

      // Update checkpoint in the same transaction
      await setOffset(client, topic, partition, currentOffset);

      processedUpTo = currentOffset;
      resolveOffset(message.offset);
      count++;

      // Cooperative heartbeats in long batches
      if (count % 50 === 0) await heartbeat();
    }
  });

  // Only commit after the transaction succeeds
  await commitOffsetsIfNecessary();
}

async function main() {
  console.log("Starting projection app…");
  const consumer = await runConsumer(handleBatch);

  const shutdown = async (sig: string) => {
    console.log(`\n${sig} received, shutting down…`);
    try {
      await consumer.disconnect();
      await pool.end();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

