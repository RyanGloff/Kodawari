import { randomUUID } from "crypto";
import { Router } from "express";
import { kdb } from "../kurrent.js";
import z from "zod";
import {
  jsonEvent,
  START,
  WrongExpectedVersionError,
} from "@kurrent/kurrentdb-client";
import { Pool } from "pg";
import { socketStore } from "../socketStore.js";
import {
  ApiTaskResource,
  KurrentDBTaskCompleted,
  KurrentDBTaskCreated,
  KurrentDBTaskReopened,
  KurrentDBTaskUpdated,
  TaskCompletedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskReopenedEvent,
  TaskUpdatedEvent,
} from "@model/TaskResource";

const pgHost = process.env.PG_HOST;
const pgDatabase = process.env.PG_DATABASE;
const pgUsername = process.env.PG_USERNAME;
const pgPassword = process.env.PG_PASSWORD;
const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

const pg = new Pool({ connectionString });

const router = Router();

type PgTaskRow = {
  id: string;
  name: string;
  deadline: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  deleted_at: Date | null;
  revision: number;
};
const psqlRowToApiResource = (row: PgTaskRow): ApiTaskResource => {
  return {
    id: row.id,
    name: row.name,
    deadline: row.deadline || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
    deletedAt: row.deleted_at || undefined,
    revision: row.revision,
  };
};

// ---------- Get Task By Id -------
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const taskProjectionRes = await pg.query(
    `SELECT * FROM public.tasks WHERE id = $1;`,
    [id],
  );

  if (taskProjectionRes.rows.length === 0) {
    res.sendStatus(404);
    return;
  }

  res.json(psqlRowToApiResource(taskProjectionRes.rows[0]));
});

// ---------- Get All Tasks --------
const getAllOptionsSchema = z.object({
  includeDeleted: z.boolean().optional(),
});
type GetAllOptions = z.infer<typeof getAllOptionsSchema>;

router.get("/", async (req, res) => {
  const parseResult = getAllOptionsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }
  const getAllOptions: GetAllOptions = parseResult.data;
  // TODO: Change this to something less insane
  const sql = `SELECT * FROM public.tasks ${getAllOptions.includeDeleted ? "" : "WHERE deleted_at IS NULL"}`;
  const taskProjectionRes = await pg.query(sql);

  res.json({ tasks: taskProjectionRes.rows.map(psqlRowToApiResource) });
});

// ---------- Create Task ----------

const createTaskRequestSchema = z.object({
  name: z.string(),
  deadline: z.coerce.date().nullable().optional(),
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

  const taskCreated: KurrentDBTaskCreated = {
    name: createTaskRequest.name,
    deadline:
      createTaskRequest.deadline === null
        ? undefined
        : createTaskRequest.deadline
  };

  const event = jsonEvent({
    type: TaskCreatedEvent,
    data: taskCreated,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: "no_stream",
    });
    const streamRes = kdb.readStream(id, {
      fromRevision: START,
      maxCount: 1,
    });
    const createdEvent = await streamRes.next();

    socketStore.broadcast(TaskCreatedEvent, {
      id,
      ...taskCreated,
      createdAt: createdEvent.value.event.created,
      revision: Number(nextExpectedRevision),
    });
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

// ---------- Mark Task Complete ---
const markTaskCompletedRequestSchema = z.object({
  expectedRevision: z.coerce.bigint(),
  completedAt: z.coerce.date().optional(),
});
type MarkTaskCompletedRequest = z.infer<typeof markTaskCompletedRequestSchema>;

router.post("/:id/complete", async (req, res) => {
  const id = req.params.id;

  const parseResult = markTaskCompletedRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const { completedAt, expectedRevision }: MarkTaskCompletedRequest =
    parseResult.data;

  const taskCompleted: KurrentDBTaskCompleted = {
    completedAt: completedAt ?? new Date(),
  };

  const event = jsonEvent({
    type: TaskCompletedEvent,
    data: taskCompleted,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: BigInt(expectedRevision),
    });
    socketStore.broadcast(TaskCompletedEvent, {
      id,
      ...taskCompleted,
      revision: Number(nextExpectedRevision),
    });
    return res.status(202).json({
      id,
      status: "task-completed",
      nextExpectedRevision: Number(nextExpectedRevision),
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
      res.sendStatus(412);
      return;
    }
    console.error("Failed to append TaskCompleted event", err);
    return res.sendStatus(500);
  }
});

// ---------- Reopen Task -------
const reopenTaskRequestSchema = z.object({
  reopenedAt: z.coerce.date().optional(),
  expectedRevision: z.coerce.bigint(),
});
type ReopenTaskRequest = z.infer<typeof reopenTaskRequestSchema>;

router.post("/:id/reopen", async (req, res) => {
  const id = req.params.id;

  const parseResult = reopenTaskRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const { reopenedAt, expectedRevision }: ReopenTaskRequest = parseResult.data;

  const taskReopened: KurrentDBTaskReopened = {
    reopenedAt: reopenedAt ?? new Date(),
  };

  const event = jsonEvent({
    type: TaskReopenedEvent,
    data: taskReopened,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: BigInt(expectedRevision),
    });
    socketStore.broadcast(TaskReopenedEvent, {
      id,
      ...taskReopened,
      revision: Number(nextExpectedRevision),
    });
    return res.status(202).json({
      id,
      status: "task-reopened",
      nextExpectedRevision: Number(nextExpectedRevision),
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
      res.sendStatus(412);
      return;
    }
    console.error("Failed to append TaskReopened event", err);
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

  const taskUpdated: KurrentDBTaskUpdated = {
    name: updateTaskRequest.name,
  };

  const event = jsonEvent({
    type: TaskUpdatedEvent,
    data: taskUpdated,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: req.body.expectedRevision,
    });
    socketStore.broadcast(TaskUpdatedEvent, {
      id,
      ...taskUpdated,
      revision: Number(nextExpectedRevision),
    });
    return res.status(202).json({
      id,
      status: "update-accepted",
      nextExpectedRevision: Number(nextExpectedRevision),
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
      console.error(err);
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
    type: TaskDeletedEvent,
    data: {},
  });

  try {
    await kdb.appendToStream(id, event, { streamState: "stream_exists" });
    socketStore.broadcast(TaskDeletedEvent, { id });
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
      console.error(err);
      res.sendStatus(412);
      return;
    }

    console.error("Failed to append TaskDeleted event", err);
    return res.sendStatus(500);
  }
});

export default router;
