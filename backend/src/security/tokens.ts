import { createHash, randomBytes } from "node:crypto";

export function createSessionToken(): string {
  return `ris_${randomBytes(32).toString("base64url")}`;
}

export function createWebhookId(): string {
  return `whk_${randomBytes(24).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
