import { Kafka, logLevel, EachBatchPayload } from "kafkajs";
import { config } from "../config.js";

export const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

export type BatchHandler = (payload: EachBatchPayload) => Promise<void>;

export async function runConsumer(handleBatch: BatchHandler) {
  const consumer = kafka.consumer({ groupId: config.kafka.groupId, allowAutoTopicCreation: false });
  await consumer.connect();
  for (const topic of config.kafka.topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  await consumer.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: async (payload) => {
      await handleBatch(payload);
    }
  });
  return consumer;
}

