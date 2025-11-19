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
  START
} from "@kurrent/kurrentdb-client";

const router = Router();

let nextTaskId = 1;

// ---------- Create Task ----------

const createTaskRequestSchema = z.object({
  name: z.string(),
});
type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;

router.post("/", async (req, res) => {
  const parseResult = createTaskRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const id = `Task-${nextTaskId++}`;
  const createTaskRequest: CreateTaskRequest = parseResult.data;

  const taskCreated: TaskCreated = {
    name: createTaskRequest.name,
  };

  const event = jsonEvent({
    type: taskCreatedEvent,
    data: taskCreated
  });

  try {
    await kdb.appendToStream(id, event, { streamState: "no_stream" });
    return res.status(201).json({ id, status: "created" });
  } catch (err) {
    if (err instanceof WrongExpectedVersionError && err.actualState === 'no_stream') {
      res.sendStatus(409);
      return;
    }
    console.error("Failed to append TaskCreated event", err);
    return res.sendStatus(500);
  }
});

// ---------- Get Task By Id -------

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  let state: any = null;

  try {
    for await (const r of kdb.readStream(id, { fromRevision: START })) {
      if (!r.event) continue;
      if (r.event.type === taskCreatedEvent) {
        const data = r.event.data as TaskCreated;
        state = { id, ... data, version: r.event.revision, deleted: false };
      }
      if (r.event.type === taskUpdatedEvent) {
        const data = r.event.data as TaskUpdated;
        state = { ... state, ... data, version: r.event.revision };
      }
      if (r.event.type === taskDeletedEvent) {
        state.deleted = true;
      }
    }
  } catch (err: any) {
    if (err.type === 'stream-not-found') {
      res.sendStatus(404);
      return;
    }
    if (err.type === 'stream-deleted') {
      res.sendStatus(404);
      return;
    }
    throw err;
  }

  if (!state) {
    res.sendStatus(404);
    return;
  }

  res.json(state);
});

// ---------- Update Task ----------

const updateTaskRequestSchema = z.object({
  name: z.string(),
  expectedRevision: z.coerce.number()
});
type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>;

router.put("/:id", async (req, res) => {
  const id = req.params.id;

  const parseResult = updateTaskRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const updateTaskRequest: UpdateTaskRequest = parseResult.data;

  const taskUpdated: TaskUpdated = {
    name: updateTaskRequest.name,
  };

  const event = jsonEvent({
    type: taskUpdatedEvent,
    data: taskUpdated
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, { streamState: req.body.expectedRevision });
    return res.status(202).json({ id, status: "update-accepted", nextExpectedRevision: `${nextExpectedRevision}` });
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      res.sendStatus(404);
      return;
    }

    if (err instanceof WrongExpectedVersionError && err.type === 'wrong-expected-version') {
      console.log(err);
      res.sendStatus(412);
      return;
    }

    console.error("Failed to append TaskUpdated event", err);
    return res.sendStatus(500);
  }
});

// ---------- Delete Task ----------

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  const event = jsonEvent({
    type: taskDeletedEvent,
    data: {}
  });

  try {
    await kdb.appendToStream(id, event, { streamState: "stream_exists" });
    return res.sendStatus(202);
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      return res.sendStatus(404);
    }

    if (err instanceof WrongExpectedVersionError && err.type === 'wrong-expected-version') {
      console.log(err);
      res.sendStatus(412);
      return;
    }

    console.error("Failed to append TaskDeleted event", err);
    return res.sendStatus(500);
  }
});

export default router;

