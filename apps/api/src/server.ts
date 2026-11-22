import { PrismaClient } from "@ledgermind/database";
import { z } from "zod";
import { createApp } from "./app.js";

const result = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  APP_ORIGIN: z.url({ protocol: /^https?$/ }).transform((value) => new URL(value)).refine(
    (url) => url.protocol === "https:" || ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
    "Use HTTPS outside loopback development.",
  ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
}).safeParse(process.env);

if (!result.success) {
  throw new Error("Set a valid DATABASE_URL, APP_ORIGIN, and PORT for the API.");
}

const db = new PrismaClient({ datasourceUrl: result.data.DATABASE_URL });
const server = createApp(
  () => db.$queryRaw`SELECT 1`,
  { db, origin: result.data.APP_ORIGIN.origin },
).listen(result.data.PORT, "0.0.0.0");

function shutdown() {
  server.close(() => void db.$disconnect());
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
