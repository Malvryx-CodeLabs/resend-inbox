import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import type { AppConfig } from "../config.js";
import { HttpError } from "../errors.js";

export function createErrorHandler(config: Pick<AppConfig, "NODE_ENV">): ErrorRequestHandler {
  return (error, _request, response, _next) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "validation_error",
          message: "Request validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      });
      return;
    }

    response.status(500).json({
      error: {
        code: "internal_error",
        message:
          config.NODE_ENV === "production"
            ? "Internal server error"
            : error instanceof Error
              ? error.message
              : "Unknown error"
      }
    });
  };
}
