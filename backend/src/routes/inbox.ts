import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  findEmailForUser,
  listEmailsForUser,
  listThreadEmailsForUser,
  listThreadsForUser
} from "../db/repositories.js";
import { badRequest, notFound } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeEmail, serializeThread } from "../serializers.js";
import type { AppDependencies } from "../types.js";

const listEmailsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
  alias: z.string().email().optional()
});

const listThreadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export function inboxRouter(dependencies: AppDependencies): Router {
  const router = Router();
  const auth = requireAuth(dependencies);

  router.get("/emails", auth, async (request, response, next) => {
    try {
      const query = listEmailsQuerySchema.parse(request.query);
      const emails = await listEmailsForUser(
        dependencies.collections,
        request.auth!.user._id,
        {
          limit: query.limit,
          before: query.before ? new Date(query.before) : undefined,
          alias: query.alias
        }
      );

      response.json({ data: emails.map(serializeEmail) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/emails/:id", auth, async (request, response, next) => {
    try {
      if (!ObjectId.isValid(request.params.id)) {
        throw badRequest("Invalid email id");
      }

      const email = await findEmailForUser(
        dependencies.collections,
        request.auth!.user._id,
        new ObjectId(request.params.id)
      );

      if (!email) {
        throw notFound("Email not found");
      }

      response.json({ data: serializeEmail(email) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/threads", auth, async (request, response, next) => {
    try {
      const query = listThreadsQuerySchema.parse(request.query);
      const threads = await listThreadsForUser(
        dependencies.collections,
        request.auth!.user._id,
        query.limit
      );

      response.json({ data: threads.map(serializeThread) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/threads/:threadId/emails", auth, async (request, response, next) => {
    try {
      const emails = await listThreadEmailsForUser(
        dependencies.collections,
        request.auth!.user._id,
        request.params.threadId
      );

      response.json({ data: emails.map(serializeEmail) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
