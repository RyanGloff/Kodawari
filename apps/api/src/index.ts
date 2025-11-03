import express from "express";
import http from "http";
import { ensureKafka, startConsumer } from "./kafka.js";
import healthRouter from "./routes/health.js";
import { startSocketIO } from "./socketIO.js";
import { events } from "./events.js";

const PORT = parseInt(process.env.port ?? "3000", 10);
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use("/", healthRouter);

app.listen(PORT, async () => {
  startSocketIO(server);
  await ensureKafka(events);
  await startConsumer(events);
  console.log(`API listening on :${PORT}`);
});
