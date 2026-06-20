import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { AppDependencies } from "../types.js";
import { requireAuth } from "../middleware/auth.js";
import {
  encryptApiKey,
  fingerprintApiKey,
  redactApiKey
} from "../security/apiKeys.js";
import { createSessionToken, hashToken } from "../security/tokens.js";
import { forbidden } from "../errors.js";

const createSessionSchema = z.object({
  api_key: z.string().min(1),
  registration_key: z.string().min(1),
  email: z.string().email().optional()
});

export function authRouter(dependencies: AppDependencies): Router {
  const router = Router();
  const auth = requireAuth(dependencies);

  router.post("/sessions", async (request, response, next) => {
    try {
      const body = createSessionSchema.parse(request.body);

      if (body.registration_key !== dependencies.config.SERVER_REGISTRATION_KEY) {
        throw forbidden("Invalid server registration key");
      }

      const domains = await dependencies.resendClient.listDomains(body.api_key);
      const fingerprint = fingerprintApiKey(
        body.api_key,
        dependencies.config.API_KEY_ENCRYPTION_SECRET
      );
      const now = new Date();
      const sessionToken = createSessionToken();
      const existingUser = await dependencies.collections.users.findOne({
        apiKeyFingerprint: fingerprint
      });
      const userId = existingUser?._id ?? new ObjectId();
      const email = body.email ?? existingUser?.email ?? `${fingerprint.slice(0, 16)}@resend-inbox.local`;

      await dependencies.collections.users.updateOne(
        { _id: userId },
        {
          $setOnInsert: {
            _id: userId,
            createdAt: now
          },
          $set: {
            email,
            apiKeyEncrypted: encryptApiKey(
              body.api_key,
              dependencies.config.API_KEY_ENCRYPTION_SECRET
            ),
            apiKeyFingerprint: fingerprint,
            sessionTokenHash: hashToken(sessionToken),
            updatedAt: now
          }
        },
        { upsert: true }
      );

      await Promise.all(
        domains.map((domain) =>
          dependencies.collections.domains.updateOne(
            { domain: domain.name },
            {
              $setOnInsert: {
                createdAt: now
              },
              $set: {
                userId,
                domain: domain.name,
                verified: domain.status === "verified",
                inboundEnabled: domain.status === "verified",
                updatedAt: now
              }
            },
            { upsert: true }
          )
        )
      );

      response.json({
        session: {
          token: sessionToken
        },
        user: {
          id: userId.toHexString(),
          email
        },
        api_key: {
          fingerprint,
          display: redactApiKey(body.api_key)
        },
        domains: domains.map((domain) => ({
          id: domain.id,
          domain: domain.name,
          verified: domain.status === "verified",
          inbound_enabled: domain.status === "verified"
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", auth, async (request, response, next) => {
    try {
      const webhookConfig = await dependencies.collections.webhookConfigs.findOne({
        userId: request.auth!.user._id
      });

      response.json({
        user: {
          id: request.auth!.user._id.toHexString(),
          email: request.auth!.user.email
        },
        api_key: {
          display: redactApiKey(request.auth!.apiKey)
        },
        domains: await domainsForUser(dependencies, request.auth!.user._id),
        webhook: webhookConfig
          ? {
              webhook_id: webhookConfig.webhookId,
              url: `${dependencies.config.PUBLIC_BACKEND_URL.replace(/\/+$/, "")}/webhook/resend/${webhookConfig.webhookId}`,
              enabled: webhookConfig.enabled,
              configured: Boolean(webhookConfig.signingSecretEncrypted),
              last_received_at: webhookConfig.lastReceivedAt?.toISOString() ?? null
            }
          : null
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/me", auth, async (request, response, next) => {
    try {
      const userId = request.auth!.user._id;

      await Promise.all([
        dependencies.collections.emails.deleteMany({ userId }),
        dependencies.collections.threads.deleteMany({ userId }),
        dependencies.collections.domains.deleteMany({ userId }),
        dependencies.collections.webhookConfigs.deleteMany({ userId }),
        dependencies.collections.deviceTokens.deleteMany({ userId }),
        dependencies.collections.rateLimits.deleteMany({
          key: `send:${userId.toHexString()}`
        }),
        dependencies.collections.users.deleteOne({ _id: userId })
      ]);

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function domainsForUser(dependencies: AppDependencies, userId: ObjectId) {
  const domains = await dependencies.collections.domains
    .find({ userId })
    .sort({ domain: 1 })
    .toArray();

  return domains.map((domain) => ({
    id: domain._id.toHexString(),
    domain: domain.domain,
    verified: domain.verified,
    inbound_enabled: domain.inboundEnabled
  }));
}
