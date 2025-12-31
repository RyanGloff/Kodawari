import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import healthRouter from "./routes/health.js";
import ApiRouter from "./routes/ApiRouter.js";
import { socketStore } from "./socketStore.js";

const PORT = parseInt(process.env.port ?? "3000", 10);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true
  },
});

app.use(express.json());
app.use(cors());
app.options("*", cors());
app.use("/health", healthRouter);
app.use("/api", ApiRouter);

io.on("connection", (socket) => {
  const id = socket.id; // TODO: Change this to something specific to a user and allow multiple sockets per user
  console.log("Client connected:", socket.id);
  socketStore.putSocket(id, socket);

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
    socketStore.removeSocket(id);
  });
});

server.listen(PORT, async () => {
  console.log(`API listening on :${PORT}`);
});
