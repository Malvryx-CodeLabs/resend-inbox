import {
  Collection,
  MongoClient,
  type Db,
  type MongoClientOptions
} from "mongodb";
import type {
  DeviceTokenDocument,
  DomainDocument,
  EmailDocument,
  RateLimitDocument,
  ThreadDocument,
  UserDocument,
  WebhookConfigDocument
} from "./types.js";

export interface Collections {
  users: Collection<UserDocument>;
  domains: Collection<DomainDocument>;
  emails: Collection<EmailDocument>;
  threads: Collection<ThreadDocument>;
  rateLimits: Collection<RateLimitDocument>;
  deviceTokens: Collection<DeviceTokenDocument>;
  webhookConfigs: Collection<WebhookConfigDocument>;
}

export interface Database {
  client: MongoClient;
  db: Db;
  collections: Collections;
}

export async function connectDatabase(
  uri: string,
  dbName: string,
  options: MongoClientOptions = {}
): Promise<Database> {
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    ...options
  });

  await client.connect();
  const db = client.db(dbName);
  const collections = getCollections(db);

  await createIndexes(collections);

  return { client, db, collections };
}

export function getCollections(db: Db): Collections {
  return {
    users: db.collection<UserDocument>("users"),
    domains: db.collection<DomainDocument>("domains"),
    emails: db.collection<EmailDocument>("emails"),
    threads: db.collection<ThreadDocument>("threads"),
    rateLimits: db.collection<RateLimitDocument>("rate_limits"),
    deviceTokens: db.collection<DeviceTokenDocument>("device_tokens"),
    webhookConfigs: db.collection<WebhookConfigDocument>("webhook_configs")
  };
}

async function createIndexes(collections: Collections): Promise<void> {
  await Promise.all([
    collections.users.createIndex({ apiKeyFingerprint: 1 }, { unique: true }),
    collections.users.createIndex({ sessionTokenHash: 1 }, { unique: true, sparse: true }),
    collections.users.createIndex({ email: 1 }),
    collections.domains.createIndex({ domain: 1 }, { unique: true }),
    collections.domains.createIndex({ userId: 1, domain: 1 }),
    collections.emails.createIndex({ userId: 1, createdAt: -1 }),
    collections.emails.createIndex({ userId: 1, threadId: 1, createdAt: 1 }),
    collections.emails.createIndex(
      { userId: 1, messageId: 1 },
      { unique: true }
    ),
    collections.emails.createIndex({ domain: 1, createdAt: -1 }),
    collections.threads.createIndex({ userId: 1, lastMessageAt: -1 }),
    collections.threads.createIndex(
      { userId: 1, threadId: 1 },
      { unique: true }
    ),
    collections.rateLimits.createIndex({ key: 1 }, { unique: true }),
    collections.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.deviceTokens.createIndex({ userId: 1, token: 1 }, { unique: true }),
    collections.deviceTokens.createIndex({ token: 1 }),
    collections.webhookConfigs.createIndex({ userId: 1 }, { unique: true }),
    collections.webhookConfigs.createIndex({ webhookId: 1 }, { unique: true })
  ]);
}
