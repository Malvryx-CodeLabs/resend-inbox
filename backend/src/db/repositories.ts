import { ObjectId, type Filter, type WithId } from "mongodb";
import type { Collections } from "./mongo.js";
import type {
  DomainDocument,
  EmailDocument,
  ThreadDocument,
  UserDocument
} from "./types.js";

export interface EmailListOptions {
  limit: number;
  before?: Date;
  alias?: string;
}

export async function findUserByApiKeyFingerprint(
  collections: Collections,
  apiKeyFingerprint: string
): Promise<WithId<UserDocument> | null> {
  return collections.users.findOne({ apiKeyFingerprint });
}

export async function findVerifiedDomainForUser(
  collections: Collections,
  userId: ObjectId,
  domain: string
): Promise<WithId<DomainDocument> | null> {
  return collections.domains.findOne({
    userId,
    domain: domain.toLowerCase(),
    verified: true
  });
}

export async function findInboundDomain(
  collections: Collections,
  domain: string
): Promise<WithId<DomainDocument> | null> {
  return collections.domains.findOne({
    domain: domain.toLowerCase(),
    verified: true,
    inboundEnabled: true
  });
}

export async function listEmailsForUser(
  collections: Collections,
  userId: ObjectId,
  options: EmailListOptions
): Promise<WithId<EmailDocument>[]> {
  const filter: Filter<EmailDocument> = { userId };

  if (options.before) {
    filter.createdAt = { $lt: options.before };
  }

  if (options.alias) {
    filter["to.email"] = options.alias.toLowerCase();
  }

  return collections.emails
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit)
    .toArray();
}

export async function findEmailForUser(
  collections: Collections,
  userId: ObjectId,
  emailId: ObjectId
): Promise<WithId<EmailDocument> | null> {
  return collections.emails.findOne({ _id: emailId, userId });
}

export async function listThreadsForUser(
  collections: Collections,
  userId: ObjectId,
  limit: number
): Promise<WithId<ThreadDocument>[]> {
  return collections.threads
    .find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .toArray();
}

export async function findThreadForUser(
  collections: Collections,
  userId: ObjectId,
  threadId: string
): Promise<WithId<ThreadDocument> | null> {
  return collections.threads.findOne({ userId, threadId });
}

export async function listThreadEmailsForUser(
  collections: Collections,
  userId: ObjectId,
  threadId: string
): Promise<WithId<EmailDocument>[]> {
  return collections.emails
    .find({ userId, threadId })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function upsertThreadForEmail(
  collections: Collections,
  email: EmailDocument
): Promise<void> {
  const participants = new Set<string>([
    email.from.email,
    ...email.to.map((address) => address.email),
    ...email.cc.map((address) => address.email),
    ...email.replyTo.map((address) => address.email)
  ]);
  const now = new Date();

  await collections.threads.updateOne(
    { userId: email.userId, threadId: email.threadId },
    {
      $setOnInsert: {
        userId: email.userId,
        threadId: email.threadId,
        createdAt: now
      },
      $set: {
        subject: email.subject,
        updatedAt: now
      },
      $max: {
        lastMessageAt: email.createdAt
      },
      $addToSet: {
        participants: { $each: [...participants].filter(Boolean) }
      }
    },
    { upsert: true }
  );
}

export async function insertEmail(
  collections: Collections,
  email: EmailDocument
): Promise<EmailDocument> {
  await collections.emails.insertOne(email);
  await upsertThreadForEmail(collections, email);
  return email;
}
