import { PrismaClient } from "@ledgermind/database";
import { z } from "zod";
import { createApp } from "./app.js";
import { createLocalInvoiceStorage } from "./lib/invoice-storage.js";

const environmentSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(?:ql)?$/ }),
  APP_ORIGIN: z.url({ protocol: /^https?$/ }).transform((value) => new URL(value)).refine(
    (url) => url.protocol === "https:" || ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname),
    "Use HTTPS outside loopback development.",
  ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  INVOICE_MAX_FILE_BYTES: z.coerce.number().int().min(1).max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  INVOICE_STORAGE_DIR: z.string().trim().min(1).default("../../.invoice-files"),
});

function validateEnvironment() {
  const result = environmentSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error("Check the API database, origin, port, and invoice upload configuration.");
  }

  return result.data;
}

const environment = validateEnvironment();
const db = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
const invoiceStorage = createLocalInvoiceStorage(environment.INVOICE_STORAGE_DIR);

const app = createApp(
  () => db.$queryRaw`SELECT 1`,
  {
    db,
    origin: environment.APP_ORIGIN.origin,
    invoices: {
      storage: invoiceStorage,
      maxBytes: environment.INVOICE_MAX_FILE_BYTES,
    },
  },
);

const server = app.listen(environment.PORT, "0.0.0.0");

function shutdown() {
  server.close(() => {
    void db.$disconnect();
  });
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
