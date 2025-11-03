import { KurrentDBClient } from "@kurrent/kurrentdb-client";

// dev (insecure) example: esdb://kurrentdb:2113?tls=false
// secure is default; add creds/certs per your deployment
const cs =
  process.env.KURRENTDB_CONNECTION_STRING ?? "esdb://localhost:2113?tls=false";

export const kdb = KurrentDBClient.connectionString(cs);
