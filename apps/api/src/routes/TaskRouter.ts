import { randomUUID } from "crypto";
import { Router, Response } from "express";
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
import { KurrentDBTagAttachedToTask, TagAttachedToTaskEvent } from "@model/TaskResource.js";

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
  tags: PgTagRow[] | undefined;
  user_id: string;
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
    tags: row.tags?.map(psqlTagRowToApiResource)
  };
};
type PgTagRow = {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  revision: number;
  user_id: string;
};
const psqlTagRowToApiResource = (row: PgTagRow): ApiTaskResource => {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
    revision: row.revision
  };
};

const ensureUserOwnsTask = async (res: Response, taskId: string, userId?: string): Promise<void> => {
  try {
    const streamRes = kdb.readStream(taskId, {
      fromRevision: START,
      maxCount: 1,
    });
    const createdEvent = await streamRes.next();
    if (createdEvent.value.event.userId !== userId) {
      res.sendStatus(404);
      return;
    }
  } catch (err) {
    res.sendStatus(500);
  }
};
const ensureUserOwnsTag = async (res: Response, tagId: string, userId?: string): Promise<void> => {
  try {
    const streamRes = kdb.readStream(tagId, {
      fromRevision: START,
      maxCount: 1,
    });
    const createdEvent = await streamRes.next();
    if (createdEvent.value.event.userId !== userId) {
      res.sendStatus(404);
      return;
    }
  } catch (err) {
    res.sendStatus(500);
  }
};

// ---------- Get Task By Id -------
const getByIdOptionsSchema = z.object({
  includeTags: z.coerce.boolean().default(true)
}).optional();
type GetByIdOptions = z.infer<typeof getByIdOptionsSchema>;
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  await ensureUserOwnsTask(res, id, req.user?.id);

  const parseResult = getByIdOptionsSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const options = parseResult.data;

  const taskProjectionRes = await pg.query(
    `SELECT * FROM public.tasks WHERE id = $1 AND user_id = $2;`,
    [id, req.user?.id],
  );
  if (taskProjectionRes.rows.length === 0) {
    res.sendStatus(404);
    return;
  }
  const taskResource = psqlRowToApiResource(taskProjectionRes.rows[0]);

  if (options?.includeTags) {
    taskResource.tags = (await pg.query(`
SELECT tags.name as name FROM public.task_tag as tt 
  INNER JOIN public.tags as tags
    ON tt.tag_id = tags.id
  WHERE tt.task_id = $1;`,
      [id]
    )).rows.map(psqlTagRowToApiResource);
  }

  res.json(taskResource);
});

// ---------- Get All Tasks --------
const getAllOptionsSchema = z.object({
  includeDeleted: z.coerce.boolean().default(false),
  includeTags: z.coerce.boolean().default(true)
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
  let sql = `
SELECT
  t.*,
  ${getAllOptions.includeTags ? `COALESCE(
    json_agg(
      json_build_object(
        'id', tg.id,
        'name', tg.name
      )
    ) FILTER (WHERE tg.id IS NOT NULL),
    '[]'
  ) AS tags` : ''}
FROM tasks t
${getAllOptions.includeTags ? `
LEFT JOIN task_tag tt ON tt.task_id = t.id
LEFT JOIN tags tg ON tg.id = tt.tag_id
WHERE t.user_id = $1
GROUP BY t.id` : ''}
ORDER BY t.id;
`;
  const taskProjectionRes = await pg.query(sql, [req.user?.id]);
  const tasks = taskProjectionRes.rows.map(psqlRowToApiResource);

  res.json({ tasks });
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
        : createTaskRequest.deadline,
    userId: req.user?.id
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
      userId: req.user?.id
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
  await ensureUserOwnsTask(res, id, req.user?.id);

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

  await ensureUserOwnsTask(res, id, req.user?.id);

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
  await ensureUserOwnsTask(res, id, req.user?.id);

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
  await ensureUserOwnsTask(res, id, req.user?.id);

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

const attachTagRequestSchema = z.object({
  tagId: z.string()
});
type AttachTagRequest = z.infer<typeof attachTagRequestSchema>;
router.post("/:id/attachTag", async (req, res) => {
  const taskId = req.params.id;
  await ensureUserOwnsTask(res, taskId, req.user?.id);

  const parseResult = attachTagRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }
  const attachTagRequest: AttachTagRequest = parseResult.data;
  await ensureUserOwnsTag(res, attachTagRequest.tagId, req.user?.id);

  const tagAttachedToTask: KurrentDBTagAttachedToTask = {
    tagId: attachTagRequest.tagId,
  };

  const event = jsonEvent({
    type: TagAttachedToTaskEvent,
    data: tagAttachedToTask,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(taskId, event, {
      streamState: req.body.expectedRevision,
    });
    socketStore.broadcast(TagAttachedToTaskEvent, {
      taskId,
      tagId: attachTagRequest.tagId,
      revision: Number(nextExpectedRevision),
    });
    return res.status(202).json({
      id: taskId,
      status: "tag-attached",
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

    console.error("Failed to append TagAttachedToTask event", err);
    return res.sendStatus(500);
  }
  
});

export default router;
