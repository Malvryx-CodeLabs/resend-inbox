import type { NextFunction, Request, Response } from "express";
import type { WithId } from "mongodb";
import type { UserDocument } from "../db/types.js";
import { unauthorized } from "../errors.js";
import { fingerprintApiKey } from "../security/apiKeys.js";
import type { AppDependencies } from "../types.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      apiKey: string;
      user: WithId<UserDocument>;
    };
  }
}

export function requireAuth(dependencies: AppDependencies) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const apiKey = getBearerToken(request);

      if (!apiKey) {
        throw unauthorized();
      }

      const fingerprint = fingerprintApiKey(
        apiKey,
        dependencies.config.API_KEY_ENCRYPTION_SECRET
      );
      const user = await dependencies.collections.users.findOne({
        apiKeyFingerprint: fingerprint
      });

      if (!user) {
        throw unauthorized("Invalid API key");
      }

      request.auth = { apiKey, user };
      next();
    } catch (error) {
      next(error);
    }
  };
}

function getBearerToken(request: Request): string | null {
  const header = request.header("authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}
