import type { NextFunction, Request, Response } from "express";
import type { WithId } from "mongodb";
import type { UserDocument } from "../db/types.js";
import { unauthorized } from "../errors.js";
import { decryptApiKey } from "../security/apiKeys.js";
import { hashToken } from "../security/tokens.js";
import type { AppDependencies } from "../types.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      apiKey: string;
      user: WithId<UserDocument>;
      sessionToken: string;
    };
  }
}

export function requireAuth(dependencies: AppDependencies) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const sessionToken = getBearerToken(request);

      if (!sessionToken) {
        throw unauthorized();
      }

      const user = await dependencies.collections.users.findOne({
        sessionTokenHash: hashToken(sessionToken)
      });

      if (!user) {
        throw unauthorized("Invalid session");
      }

      request.auth = {
        apiKey: decryptApiKey(
          user.apiKeyEncrypted,
          dependencies.config.API_KEY_ENCRYPTION_SECRET
        ),
        user,
        sessionToken
      };
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
