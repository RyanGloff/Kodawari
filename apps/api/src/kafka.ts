import { Kafka, logLevel } from "kafkajs";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9094").split(",");
const GROUP_ID = "demo-consumer";

const kafka = new Kafka({
  clientId: "ts-api",
  brokers,
  logLevel: logLevel.ERROR,
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: GROUP_ID });

export class KafkaTopicError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export async function ensureKafka(topics: string[]) {
  await sleep(1000);

  const MAX_ENSURE_TOPIC_ATTEMPTS = 10;
  let success = false;
  for (let attempt = 1; attempt <= MAX_ENSURE_TOPIC_ATTEMPTS; attempt++) {
    const admin = kafka.admin();
    await admin.connect();
    try {
      const meta = await admin.fetchTopicMetadata();
      const existing = new Set(meta.topics.map((t) => t.name));
      const toCreate = topics
        .filter((t) => !existing.has(t))
        .map((t) => ({
          topic: t,
          numPartitions: 1,
          replicationFactor: 1,
        }));

      if (toCreate.length) {
        console.log(`Topics missing: ${toCreate.map((t) => t.topic)}`);
        await admin.createTopics({ topics: toCreate, waitForLeaders: true });
      }
      success = true;
      console.log(`Successfully ensured kafka topics`);
      break;
    } catch (e: any) {
      console.error("Failure to ensure topics ", e);
      await sleep(1000);
      continue;
    } finally {
      await admin.disconnect();
    }
  }
  if (!success) {
    console.error(
      `Unable to ensure topics after ${MAX_ENSURE_TOPIC_ATTEMPTS} attempts. Exiting`,
    );
    throw new KafkaTopicError("Unable to ensure topics");
  }

  await producer.connect();
  await consumer.connect();
}

type Msg = { id: string; message: string; ts: number };
export const messageBuffer: Msg[] = [];

export async function startConsumer(topics: string[]) {
  await consumer.subscribe({ topics, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
      const payload = message.value?.toString() ?? "{}";
      try {
        const parsed = JSON.parse(payload) as Msg;
        messageBuffer.push(parsed);
        if (messageBuffer.length > 100) messageBuffer.shift();
      } catch {
        // ignore bad payloads
      }
    },
  });
}
