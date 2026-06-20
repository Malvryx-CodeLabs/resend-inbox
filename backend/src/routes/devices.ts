import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import type { AppDependencies } from "../types.js";

const registerDeviceSchema = z.object({
  token: z.string().min(20),
  platform: z.literal("android"),
  device_name: z.string().trim().min(1).max(120).optional()
});

export function devicesRouter(dependencies: AppDependencies): Router {
  const router = Router();
  const auth = requireAuth(dependencies);

  router.post("/devices", auth, async (request, response, next) => {
    try {
      const body = registerDeviceSchema.parse(request.body);
      const now = new Date();

      await dependencies.collections.deviceTokens.updateOne(
        {
          userId: request.auth!.user._id,
          token: body.token
        },
        {
          $setOnInsert: {
            _id: new ObjectId(),
            userId: request.auth!.user._id,
            token: body.token,
            platform: body.platform,
            createdAt: now
          },
          $set: {
            platform: body.platform,
            deviceName: body.device_name,
            updatedAt: now,
            lastSeenAt: now
          }
        },
        { upsert: true }
      );

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.delete("/devices/:token", auth, async (request, response, next) => {
    try {
      await dependencies.collections.deviceTokens.deleteOne({
        userId: request.auth!.user._id,
        token: request.params.token
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
