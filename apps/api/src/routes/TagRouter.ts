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
import {
  ApiTagResource,
  KurrentDBTagCreated,
  KurrentDBTagUpdated,
  TagCreatedEvent,
  TagDeletedEvent,
  TagUpdatedEvent,
} from "@model/TagResource";
import { socketStore } from "../socketStore.js";

const pgHost = process.env.PG_HOST;
const pgDatabase = process.env.PG_DATABASE;
const pgUsername = process.env.PG_USERNAME;
const pgPassword = process.env.PG_PASSWORD;
const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

const pg = new Pool({ connectionString });

const router = Router();

type PgTagRow = {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  revision: number;
};
const psqlRowToApiResource = (row: PgTagRow): ApiTagResource => {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || undefined,
    revision: row.revision,
  };
};

// ---------- Get Tag By Id -------
router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const tagProjectionRes = await pg.query(
    `SELECT * FROM public.tags WHERE id = $1;`,
    [id],
  );

  if (tagProjectionRes.rows.length === 0) {
    res.sendStatus(404);
    return;
  }

  res.json(psqlRowToApiResource(tagProjectionRes.rows[0]));
});

// ---------- Get All Tags --------
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
  const sql = `SELECT * FROM public.tags ${getAllOptions.includeDeleted ? "" : "WHERE deleted_at IS NULL"}`;
  const tagProjectionRes = await pg.query(sql);

  res.json({ tags: tagProjectionRes.rows.map(psqlRowToApiResource) });
});

// ---------- Create Tag ----------

const createTagRequestSchema = z.object({
  name: z.string(),
});
type CreateTagRequest = z.infer<typeof createTagRequestSchema>;

router.post("/", async (req, res) => {
  const parseResult = createTagRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const id = `Tag-${randomUUID()}`;
  const createTagRequest: CreateTagRequest = parseResult.data;

  const tagCreated: KurrentDBTagCreated = {
    name: createTagRequest.name,
  };

  const event = jsonEvent({
    type: TagCreatedEvent,
    data: tagCreated,
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

    socketStore.broadcast(TagCreatedEvent, {
      id,
      ...tagCreated,
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
    console.error("Failed to append TagCreated event", err);
    return res.sendStatus(500);
  }
});

// ---------- Update Tag ----------
const updateTagRequestSchema = z.object({
  name: z.string(),
  expectedRevision: z.coerce.number(),
});
type UpdateTagRequest = z.infer<typeof updateTagRequestSchema>;

router.put("/:id", async (req, res) => {
  const id = req.params.id;

  const parseResult = updateTagRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parseResult.error.format(),
    });
  }

  const updateTagRequest: UpdateTagRequest = parseResult.data;

  const tagUpdated: KurrentDBTagUpdated = {
    name: updateTagRequest.name,
  };

  const event = jsonEvent({
    type: TagUpdatedEvent,
    data: tagUpdated,
  });

  try {
    const { nextExpectedRevision } = await kdb.appendToStream(id, event, {
      streamState: req.body.expectedRevision,
    });
    socketStore.broadcast(TagUpdatedEvent, {
      id,
      ...tagUpdated,
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

    console.error("Failed to append TagUpdated event", err);
    return res.sendStatus(500);
  }
});

// ---------- Delete Tag ----------

router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  const event = jsonEvent({
    type: TagDeletedEvent,
    data: {},
  });

  try {
    await kdb.appendToStream(id, event, { streamState: "stream_exists" });
    socketStore.broadcast(TagDeletedEvent, { id });
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

    console.error("Failed to append TagDeleted event", err);
    return res.sendStatus(500);
  }
});

export default router;
