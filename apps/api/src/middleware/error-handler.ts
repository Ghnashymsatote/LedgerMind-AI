import type { ErrorRequestHandler } from "express";

export const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = (error as { status?: number }).status;
  if (status === 400 || status === 413) {
    response.status(status).json({ error: "Invalid request body." });
    return;
  }
  console.error("A business API request failed.");
  response.status(500).json({ error: "The request could not be completed." });
};
