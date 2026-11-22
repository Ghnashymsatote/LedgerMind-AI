import { PrismaClient } from "@ledgermind/database";
import { z } from "zod";
import { createApp } from "./app.js";
import { createLocalInvoiceStorage } from "./lib/invoice-storage.js";

const result = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  APP_ORIGIN: z.url({ protocol: /^https?$/ }).transform((value) => new URL(value)).refine(
    (url) => url.protocol === "https:" || ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
    "Use HTTPS outside loopback development.",
  ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  INVOICE_MAX_FILE_BYTES: z.coerce.number().int().min(1).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  INVOICE_STORAGE_DIR: z.string().trim().min(1).default("../../.invoice-files"),
}).safeParse(process.env);

if (!result.success) {
  throw new Error("Check the API database, origin, port, and invoice upload configuration.");
}

const db = new PrismaClient({ datasourceUrl: result.data.DATABASE_URL });
const server = createApp(
  () => db.$queryRaw`SELECT 1`,
  {
    db,
    origin: result.data.APP_ORIGIN.origin,
    invoices: {
      storage: createLocalInvoiceStorage(result.data.INVOICE_STORAGE_DIR),
      maxBytes: result.data.INVOICE_MAX_FILE_BYTES,
    },
  },
).listen(result.data.PORT, "0.0.0.0");

function shutdown() {
  server.close(() => void db.$disconnect());
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
