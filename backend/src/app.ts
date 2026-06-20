import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { compatibilityRouter } from "./routes/compatibility.js";
import { inboxRouter } from "./routes/inbox.js";
import { mailRouter } from "./routes/mail.js";
import { webhookRouter } from "./routes/webhook.js";
import { createErrorHandler } from "./middleware/errors.js";
import type { AppDependencies } from "./types.js";

export function createApp(dependencies: AppDependencies): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin:
        dependencies.config.allowedOrigins.length > 0
          ? dependencies.config.allowedOrigins
          : true
    })
  );

  app.use(compatibilityRouter());
  app.use(webhookRouter(dependencies));
  app.use(express.json({ limit: "1mb" }));
  app.use(authRouter(dependencies));
  app.use(inboxRouter(dependencies));
  app.use(mailRouter(dependencies));
  app.use(createErrorHandler(dependencies.config));

  return app;
}
