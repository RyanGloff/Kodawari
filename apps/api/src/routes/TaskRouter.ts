import { randomUUID } from "crypto";
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
import { Pool } from "pg";

const pgHost = process.env.PG_HOST;
const pgDatabase = process.env.PG_DATABASE;
const pgUsername = process.env.PG_USERNAME;
const pgPassword = process.env.PG_PASSWORD;
const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

const pg = new Pool({ connectionString });

const router = Router();

// ---------- Get Task By Id -------
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const taskProjectionRes = await pg.query(
    `SELECT * FROM public.tasks WHERE id = $1;`,
    [id],
  );
  console.log(JSON.stringify(taskProjectionRes));

  if (taskProjectionRes.rows.length === 0) {
    res.sendStatus(404);
    return;
  }

  res.json(taskProjectionRes.rows[0]);
});

// ---------- Get All Tasks --------
router.get("/", async (_req, res) => {
  // TODO: Change this to something less insane
  const taskProjectionRes = await pg.query(`SELECT * FROM public.tasks;`);

  res.json({ tasks: taskProjectionRes.rows });
});

// ---------- Create Task ----------

const createTaskRequestSchema = z.object({
  name: z.string(),
  deadline: z.coerce.date().optional()
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

  const id = `Task-${randomUUID()}`;
  const createTaskRequest: CreateTaskRequest = parseResult.data;

  const taskCreated: TaskCreated = {
    name: createTaskRequest.name,
    deadline: createTaskRequest.deadline
  };

  const event = jsonEvent({
    type: taskCreatedEvent,
    data: taskCreated,
  });

  try {
    await kdb.appendToStream(id, event, { streamState: "no_stream" });
    return res.status(201).json({ id, status: "created" });
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      res.sendStatus(409);
      return;
    }
    console.error("Failed to append TaskCreated event", err);
    return res.sendStatus(500);
  }
});

// ---------- Update Task ----------

const updateTaskRequestSchema = z.object({
  name: z.string(),
  expectedRevision: z.coerce.number(),
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
    data: taskUpdated,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: req.body.expectedRevision,
    });
    return res.status(202).json({
      id,
      status: "update-accepted",
      nextExpectedRevision: `${nextExpectedRevision}`,
    });
  } catch (err) {
    if (
      err instanceof WrongExpectedVersionError &&
      err.actualState === "no_stream"
    ) {
      res.sendStatus(404);
      return;
    }

    if (
      err instanceof WrongExpectedVersionError &&
      err.type === "wrong-expected-version"
    ) {
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
    data: {},
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

    if (
      err instanceof WrongExpectedVersionError &&
      err.type === "wrong-expected-version"
    ) {
      console.log(err);
      res.sendStatus(412);
      return;
    }

    console.error("Failed to append TaskDeleted event", err);
    return res.sendStatus(500);
  }
});

export default router;
