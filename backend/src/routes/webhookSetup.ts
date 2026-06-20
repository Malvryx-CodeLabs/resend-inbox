import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { encryptApiKey } from "../security/apiKeys.js";
import { createWebhookId } from "../security/tokens.js";
import type { AppDependencies } from "../types.js";

const setupWebhookSchema = z.object({
  signing_secret: z.string().min(1)
});

export function webhookSetupRouter(dependencies: AppDependencies): Router {
  const router = Router();
  const auth = requireAuth(dependencies);

  router.get("/webhooks/setup", auth, async (request, response, next) => {
    try {
      const config = await ensureWebhookConfig(
        dependencies,
        request.auth!.user._id
      );

      response.json({ data: serializeWebhookConfig(dependencies, config) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/webhooks/setup", auth, async (request, response, next) => {
    try {
      const body = setupWebhookSchema.parse(request.body);
      const config = await ensureWebhookConfig(
        dependencies,
        request.auth!.user._id
      );
      const now = new Date();

      await dependencies.collections.webhookConfigs.updateOne(
        { _id: config._id },
        {
          $set: {
            signingSecretEncrypted: encryptApiKey(
              body.signing_secret,
              dependencies.config.API_KEY_ENCRYPTION_SECRET
            ),
            enabled: true,
            updatedAt: now
          }
        }
      );

      const updated = await dependencies.collections.webhookConfigs.findOne({
        _id: config._id
      });

      response.json({
        data: serializeWebhookConfig(dependencies, updated ?? config)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function ensureWebhookConfig(
  dependencies: AppDependencies,
  userId: ObjectId
) {
  const existing = await dependencies.collections.webhookConfigs.findOne({
    userId
  });

  if (existing) {
    return existing;
  }

  const now = new Date();
  const config = {
    _id: new ObjectId(),
    userId,
    webhookId: createWebhookId(),
    enabled: false,
    createdAt: now,
    updatedAt: now
  };

  await dependencies.collections.webhookConfigs.insertOne(config);
  return config;
}

function serializeWebhookConfig(
  dependencies: AppDependencies,
  config: {
    webhookId: string;
    enabled: boolean;
    signingSecretEncrypted?: string;
    lastReceivedAt?: Date;
  }
) {
  return {
    webhook_id: config.webhookId,
    url: `${dependencies.config.PUBLIC_BACKEND_URL.replace(/\/+$/, "")}/webhook/resend/${config.webhookId}`,
    enabled: config.enabled,
    configured: Boolean(config.signingSecretEncrypted),
    last_received_at: config.lastReceivedAt?.toISOString() ?? null
  };
}
