import { Router } from "express";
import { serviceMeta, serviceVersion } from "../constants.js";

export function compatibilityRouter(): Router {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "resend-inbox-backend",
      version: serviceVersion
    });
  });

  router.get("/meta", (_request, response) => {
    response.json(serviceMeta);
  });

  return router;
}
