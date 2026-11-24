import type { RequestHandler, Router } from "express";
import multer from "multer";
import { createInvoiceController } from "./invoice.controller.js";
import type { InvoiceService } from "./invoice.service.js";

export function registerInvoiceRoutes(router: Router, invoices: InvoiceService, requireSession: RequestHandler, maxBytes: number) {
  const controller = createInvoiceController(invoices, maxBytes);
  const options = {
    defParamCharset: "utf8",
    limits: { fileSize: maxBytes + 1, files: 1, fields: 1, parts: 3, fieldSize: 128, fieldNestingDepth: 0 },
  };
  const parseUpload = multer(options).single("file");

  const upload: RequestHandler = (request, response, next) => {
    if (!request.is("multipart/form-data")) {
      response.status(415).json({ error: "Send the invoice as multipart form data." });
      return;
    }
    parseUpload(request, response, (error: unknown) => {
      if (!error) {
        next();
      } else if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        response.status(413).json({ error: "The invoice file exceeds the upload size limit." });
      } else {
        response.status(400).json({ error: "Invalid invoice upload." });
      }
    });
  };

  router.use("/invoices", requireSession);
  router.post("/invoices/upload", upload, controller.upload);
  router.post("/invoices/:id/extraction/retry", controller.retry);
  router.patch("/invoices/:id", controller.save);
  router.get("/invoices", controller.list);
  router.get("/invoices/:id/file", controller.file);
  router.get("/invoices/:id", controller.detail);
}
