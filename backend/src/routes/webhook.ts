import { Router, raw } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  findInboundDomain,
  upsertThreadForEmail
} from "../db/repositories.js";
import type { EmailDocument } from "../db/types.js";
import { decryptApiKey } from "../security/apiKeys.js";
import { verifyWebhookPayload } from "../services/webhook.js";
import type { AppDependencies } from "../types.js";
import {
  createThreadId,
  getDomainFromEmail,
  parseReferences
} from "../utils/email.js";

const inboundWebhookSchema = z
  .object({
    type: z.string(),
    data: z
      .object({
        id: z.string().optional(),
        email_id: z.string().optional(),
        from: z.union([z.string(), z.object({ email: z.string() })]).optional(),
        to: z
          .union([
            z.string(),
            z.array(z.union([z.string(), z.object({ email: z.string() })]))
          ])
          .optional()
      })
      .passthrough()
  })
  .passthrough();

export function webhookRouter(dependencies: AppDependencies): Router {
  const router = Router();

  router.post(
    "/webhook/resend",
    raw({ type: "application/json", limit: "2mb" }),
    async (request, response, next) => {
      try {
        const event = inboundWebhookSchema.parse(
          verifyWebhookPayload<unknown>(
            request,
            dependencies.config.WEBHOOK_SECRET
          )
        );
        const resendEmailId = event.data.email_id ?? event.data.id;

        if (!resendEmailId) {
          response.status(202).json({ accepted: true, ignored: true });
          return;
        }

        const recipient = getPrimaryRecipient(event.data.to);

        if (!recipient) {
          response.status(202).json({ accepted: true, ignored: true });
          return;
        }

        const domain = getDomainFromEmail(recipient);
        const mappedDomain = await findInboundDomain(
          dependencies.collections,
          domain
        );

        if (!mappedDomain) {
          response.status(202).json({ accepted: true, ignored: true });
          return;
        }

        const user = await dependencies.collections.users.findOne({
          _id: mappedDomain.userId
        });

        if (!user) {
          response.status(202).json({ accepted: true, ignored: true });
          return;
        }

        const apiKey = decryptApiKey(
          user.apiKeyEncrypted,
          dependencies.config.API_KEY_ENCRYPTION_SECRET
        );
        const receivedEmail =
          await dependencies.resendClient.retrieveReceivedEmail(
            apiKey,
            resendEmailId
          );
        const createdAt = receivedEmail.createdAt ?? new Date();
        const messageId =
          receivedEmail.messageId ??
          receivedEmail.headers["message-id"] ??
          receivedEmail.headers["Message-ID"] ??
          resendEmailId;
        const threadId = await resolveInboundThreadId(
          dependencies,
          mappedDomain.userId,
          receivedEmail.subject,
          receivedEmail.from.email,
          receivedEmail.to.map((address) => address.email),
          [
            ...parseReferences(receivedEmail.headers),
            receivedEmail.headers["in-reply-to"],
            receivedEmail.headers["In-Reply-To"]
          ].filter(Boolean)
        );
        const email: EmailDocument = {
          _id: new ObjectId(),
          userId: mappedDomain.userId,
          domain,
          threadId,
          messageId,
          resendEmailId,
          from: receivedEmail.from,
          to: receivedEmail.to,
          cc: receivedEmail.cc,
          bcc: receivedEmail.bcc,
          replyTo: receivedEmail.replyTo,
          subject: receivedEmail.subject,
          html: receivedEmail.html,
          text: receivedEmail.text,
          direction: "inbound",
          headers: receivedEmail.headers,
          attachments: receivedEmail.attachments,
          createdAt,
          updatedAt: new Date()
        };

        const insertResult = await dependencies.collections.emails.updateOne(
          { userId: email.userId, messageId: email.messageId },
          {
            $setOnInsert: email
          },
          { upsert: true }
        );

        if (insertResult.upsertedId) {
          await upsertThreadForEmail(dependencies.collections, email);
        }

        response.status(202).json({ accepted: true });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

async function resolveInboundThreadId(
  dependencies: AppDependencies,
  userId: ObjectId,
  subject: string,
  from: string,
  recipients: string[],
  referencedMessageIds: string[]
): Promise<string> {
  if (referencedMessageIds.length > 0) {
    const referencedEmail = await dependencies.collections.emails.findOne({
      userId,
      messageId: { $in: referencedMessageIds }
    });

    if (referencedEmail) {
      return referencedEmail.threadId;
    }
  }

  return createThreadId(subject, [from, ...recipients]);
}

function getPrimaryRecipient(
  value:
    | string
    | Array<string | { email: string }>
    | { email: string }
    | undefined
): string | null {
  if (!value) {
    return null;
  }

  const first = Array.isArray(value) ? value[0] : value;

  if (!first) {
    return null;
  }

  return typeof first === "string" ? first.toLowerCase() : first.email.toLowerCase();
}
