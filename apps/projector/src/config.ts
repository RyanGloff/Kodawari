import * as dotenv from "dotenv";
dotenv.config();

const req = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

export const config = {
  kafka: {
    brokers: req("KAFKA_BROKERS").split(","),
    clientId: process.env.KAFKA_CLIENT_ID ?? "projection-app",
    groupId: req("KAFKA_GROUP_ID"),
    topics: req("KAFKA_TOPICS").split(",").map(s => s.trim()).filter(Boolean),
  },
  db: {
    url: req("DATABASE_URL")
  },
  batchSize: Number(process.env.BATCH_SIZE ?? "100"),
};

