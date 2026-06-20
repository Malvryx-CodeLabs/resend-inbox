import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { AppDependencies } from "../types.js";
import {
  encryptApiKey,
  fingerprintApiKey,
  redactApiKey
} from "../security/apiKeys.js";

const validateApiKeySchema = z.object({
  api_key: z.string().min(1),
  email: z.string().email().optional()
});

export function authRouter(dependencies: AppDependencies): Router {
  const router = Router();

  router.post("/auth/validate", async (request, response, next) => {
    try {
      const body = validateApiKeySchema.parse(request.body);
      const domains = await dependencies.resendClient.listDomains(body.api_key);
      const fingerprint = fingerprintApiKey(
        body.api_key,
        dependencies.config.API_KEY_ENCRYPTION_SECRET
      );
      const now = new Date();
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

  return router;
}
