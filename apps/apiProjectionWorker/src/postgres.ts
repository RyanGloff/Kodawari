import { Pool } from "pg";

const pgHost = process.env.PG_HOST;
const pgDatabase = process.env.PG_DATABASE
const pgUsername = process.env.PG_USERNAME;
const pgPassword = process.env.PG_PASSWORD;
const connectionString = `postgresql://${pgUsername}:${pgPassword}@${pgHost}:5432/${pgDatabase}`;

export const pg = new Pool({ connectionString });
