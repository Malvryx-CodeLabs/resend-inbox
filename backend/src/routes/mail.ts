import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  findEmailForUser,
  findThreadForUser,
  findVerifiedDomainForUser,
  insertEmail
} from "../db/repositories.js";
import type { EmailDocument } from "../db/types.js";
import { badRequest, forbidden, notFound } from "../errors.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeEmail } from "../serializers.js";
import { enforceSendRateLimit } from "../services/rateLimiter.js";
import type { AppDependencies } from "../types.js";
import {
  createThreadId,
  emailAddressSchema,
  getDomainFromEmail,
  normalizeEmailAddress,
  normalizeEmailAddresses,
  parseReferences
} from "../utils/email.js";

const sendSchema = z
  .object({
    from: emailAddressSchema,
    to: z.union([emailAddressSchema, z.array(emailAddressSchema).min(1)]),
    cc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
    bcc: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
    reply_to: z.union([emailAddressSchema, z.array(emailAddressSchema)]).optional(),
    subject: z.string().trim().min(1).max(998),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional()
  })
  .refine((value) => value.html || value.text, {
    message: "Either html or text is required",
    path: ["html"]
  });

const replySchema = z
  .object({
    email_id: z.string().optional(),
    thread_id: z.string().optional(),
    from: emailAddressSchema,
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional()
  })
  .refine((value) => value.email_id || value.thread_id, {
    message: "email_id or thread_id is required",
    path: ["email_id"]
  })
  .refine((value) => value.html || value.text, {
    message: "Either html or text is required",
    path: ["html"]
  });

export function mailRouter(dependencies: AppDependencies): Router {
  const router = Router();
  const auth = requireAuth(dependencies);

  router.post("/send", auth, async (request, response, next) => {
    try {
      const body = sendSchema.parse(request.body);
      const userId = request.auth!.user._id;
      const from = normalizeEmailAddress(body.from);
      const to = normalizeEmailAddresses(body.to);
      const cc = normalizeEmailAddresses(body.cc);
      const bcc = normalizeEmailAddresses(body.bcc);
      const replyTo = normalizeEmailAddresses(body.reply_to);
      const domain = getDomainFromEmail(from.email);

      await assertOwnedDomain(dependencies, userId, domain);
      await enforceSendRateLimit(
        dependencies.collections,
        dependencies.config,
        userId
      );

      const resendResult = await dependencies.resendClient.sendEmail({
        apiKey: request.auth!.apiKey,
        from,
        to,
        cc,
        bcc,
        replyTo,
        subject: body.subject,
        html: body.html,
        text: body.text
      });
      const now = new Date();
      const threadId = createThreadId(body.subject, [
        from.email,
        ...to.map((address) => address.email)
      ]);
      const email: EmailDocument = {
        _id: new ObjectId(),
        userId,
        domain,
        threadId,
        messageId: resendResult.id,
        resendEmailId: resendResult.id,
        from,
        to,
        cc,
        bcc,
        replyTo,
        subject: body.subject,
        html: body.html,
        text: body.text,
        direction: "outbound",
        headers: {},
        attachments: [],
        createdAt: now,
        updatedAt: now
      };

      await insertEmail(dependencies.collections, email);

      response.status(201).json({
        id: resendResult.id,
        data: serializeEmail(email)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/reply", auth, async (request, response, next) => {
    try {
      const body = replySchema.parse(request.body);
      const userId = request.auth!.user._id;
      const from = normalizeEmailAddress(body.from);
      const domain = getDomainFromEmail(from.email);

      await assertOwnedDomain(dependencies, userId, domain);
      await enforceSendRateLimit(
        dependencies.collections,
        dependencies.config,
        userId
      );

      const context = await resolveReplyContext(dependencies, userId, body);
      const references = [
        ...parseReferences(context.headers),
        context.messageId
      ].filter(Boolean);
      const subject = context.subject.match(/^re:/i)
        ? context.subject
        : `Re: ${context.subject}`;
      const headers = {
        "In-Reply-To": context.messageId,
        References: [...new Set(references)].join(" ")
      };

      const resendResult = await dependencies.resendClient.sendEmail({
        apiKey: request.auth!.apiKey,
        from,
        to: [context.from],
        cc: [],
        bcc: [],
        replyTo: [],
        subject,
        html: body.html,
        text: body.text,
        headers
      });
      const now = new Date();
      const email: EmailDocument = {
        _id: new ObjectId(),
        userId,
        domain,
        threadId: context.threadId,
        messageId: resendResult.id,
        resendEmailId: resendResult.id,
        from,
        to: [context.from],
        cc: [],
        bcc: [],
        replyTo: [],
        subject,
        html: body.html,
        text: body.text,
        direction: "outbound",
        headers,
        attachments: [],
        createdAt: now,
        updatedAt: now
      };

      await insertEmail(dependencies.collections, email);

      response.status(201).json({
        id: resendResult.id,
        data: serializeEmail(email)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function assertOwnedDomain(
  dependencies: AppDependencies,
  userId: ObjectId,
  domain: string
): Promise<void> {
  const ownedDomain = await findVerifiedDomainForUser(
    dependencies.collections,
    userId,
    domain
  );

  if (!ownedDomain) {
    throw forbidden("From address domain is not verified for this user");
  }
}

async function resolveReplyContext(
  dependencies: AppDependencies,
  userId: ObjectId,
  body: z.infer<typeof replySchema>
): Promise<EmailDocument> {
  if (body.email_id) {
    if (!ObjectId.isValid(body.email_id)) {
      throw badRequest("Invalid email_id");
    }

    const email = await findEmailForUser(
      dependencies.collections,
      userId,
      new ObjectId(body.email_id)
    );

    if (!email) {
      throw notFound("Reply email not found");
    }

    return email;
  }

  const thread = await findThreadForUser(
    dependencies.collections,
    userId,
    body.thread_id!
  );

  if (!thread) {
    throw notFound("Reply thread not found");
  }

  const [latest] = await dependencies.collections.emails
    .find({ userId, threadId: thread.threadId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (!latest) {
    throw notFound("Reply thread has no emails");
  }

  return latest;
}
