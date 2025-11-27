import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import ApiRouter from "./routes/ApiRouter.js";

const PORT = parseInt(process.env.port ?? "3000", 10);
const app = express();

app.use(express.json());
app.use(cors());
app.use("/", (req, res, next) => {
  console.log(req.body);
  next();
});
app.use("/health", healthRouter);
app.use("/api", ApiRouter);

app.listen(PORT, async () => {
  console.log(`API listening on :${PORT}`);
});
