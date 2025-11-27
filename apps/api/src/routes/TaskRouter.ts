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
  START,
  ResolvedEvent,
  EventType,
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

type TaskProjection = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  revision: bigint;
  deleted: boolean;
};
async function createProjectionsFromEvents(
  events: AsyncIterableIterator<ResolvedEvent<EventType>>,
): Promise<Map<string, TaskProjection>> {
  const taskMap = new Map<string, TaskProjection>();
  for await (const r of events) {
    if (!r.event) continue;
    const streamId = r.event.streamId;
    if (r.event.type === taskCreatedEvent) {
      const data = r.event.data as TaskCreated;
      taskMap.set(streamId, {
        id: streamId,
        ...data,
        revision: r.event.revision,
        deleted: false,
        createdAt: r.event.created,
        updatedAt: r.event.created,
      });
    }
    if (r.event.type === taskUpdatedEvent) {
      const data = r.event.data as TaskUpdated;
      if (!taskMap.has(streamId)) {
        throw new Error(
          `Task with id: ${streamId} was updated before it was created`,
        );
      }
      const oldTask = taskMap.get(streamId);
      if (!oldTask) {
        throw new Error(`Can not update a non-existing task`);
      }
      taskMap.set(streamId, {
        ...oldTask,
        ...data,
        revision: r.event.revision,
        updatedAt: r.event.created,
      });
    }
    if (r.event.type === taskDeletedEvent) {
      if (!taskMap.has(streamId)) {
        throw new Error(
          `Task with id: ${streamId} was deleted before it was created`,
        );
      }
      const oldTask = taskMap.get(streamId);
      if (!oldTask) {
        continue;
      }
      oldTask.deleted = true;
    }
  }
  return taskMap;
}

// ---------- Get Task By Id -------

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const projectionMap = await createProjectionsFromEvents(
    kdb.readStream(id, { fromRevision: START }),
  );
  const projection = projectionMap.get(id);
  if (!projection) {
    res.sendStatus(404);
    return;
  }

  res.json(projection);
});

// ---------- Get All Tasks --------
// TODO: Replace with projection as this doesn't scale

router.get("/", async (_req, res) => {
  const stream = "$ce-Task";
  try {
    const taskMap = await createProjectionsFromEvents(
      kdb.readStream(stream, { fromRevision: START }),
    );
    res.json(taskMap.values());
  } catch (err) {
    res.sendStatus(500);
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
