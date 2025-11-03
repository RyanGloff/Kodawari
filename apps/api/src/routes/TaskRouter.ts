import { Router } from "express";
import { kdb } from "../kurrent.js";
import z from "zod";
import {
  TaskCreated,
  taskCreatedEvent,
  taskDeletedEvent,
  TaskUpdated,
  taskUpdatedEvent,
} from "../events.js";
import {
  jsonEvent,
  WrongExpectedVersionError,
} from "@kurrent/kurrentdb-client";

const router = Router();

let nextTaskId = 1;
const createTaskRequestSchema = z.object({
  name: z.string(),
});
type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
router.post("/", async (req, res) => {
  const id = `Task-${nextTaskId++}`;
  const createTaskRequest: CreateTaskRequest = createTaskRequestSchema.parse(
    req.body,
  );
  const taskCreated: TaskCreated = {
    name: createTaskRequest.name,
  };
  const event = jsonEvent({
    type: taskCreatedEvent,
    data: JSON.stringify(taskCreated),
  });
  await kdb.appendToStream(id, event);
  res.status(201).send("Accepted");
});

const updateTaskRequestSchema = z.object({
  name: z.string(),
});
type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const updateTaskRequest: UpdateTaskRequest = updateTaskRequestSchema.parse(
    req.body,
  );
  const taskUpdated: TaskUpdated = {
    name: updateTaskRequest.name,
  };
  const event = jsonEvent({
    type: taskUpdatedEvent,
    data: JSON.stringify(taskUpdated),
  });
  try {
    await kdb.appendToStream(id, event, { streamState: "stream_exists" });
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      res.sendStatus(404);
      return;
    }
    console.log(err);
    res.sendStatus(500);
  }
  res.status(201).send("Accepted");
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const event = jsonEvent({
    type: taskDeletedEvent,
    data: "",
  });
  try {
    await kdb.appendToStream(id, event, { streamState: "stream_exists" });
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      res.sendStatus(404);
      return;
    }
    console.log(err);
    res.sendStatus(500);
  }
  res.sendStatus(201).send("Accepted");
});
export default router;
