import type { Request } from "express";
import { Webhook } from "svix";
import { badRequest, unauthorized } from "../errors.js";

export function verifyWebhookPayload<T>(
  request: Request,
  webhookSecret: string
): T {
  const rawBody = request.body;

  if (!Buffer.isBuffer(rawBody)) {
    throw badRequest("Webhook route requires raw request body");
  }

  try {
    const webhook = webhookSecret.startsWith("whsec_")
      ? new Webhook(webhookSecret)
      : new Webhook(webhookSecret, { format: "raw" });
    return webhook.verify(rawBody, {
      "svix-id": requiredHeader(request, "svix-id"),
      "svix-timestamp": requiredHeader(request, "svix-timestamp"),
      "svix-signature": requiredHeader(request, "svix-signature")
    }) as T;
  } catch {
    throw unauthorized("Invalid webhook signature");
  }
}

function requiredHeader(request: Request, name: string): string {
  const value = request.header(name);

  if (!value) {
    throw unauthorized("Missing webhook signature headers");
  }

  return value;
}
