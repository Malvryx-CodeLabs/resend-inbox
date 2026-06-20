import { ObjectId, type Filter, type OptionalUnlessRequiredId, type WithId } from "mongodb";
import type { Collections } from "../src/db/mongo.js";
import type {
  DomainDocument,
  EmailDocument,
  RateLimitDocument,
  ThreadDocument,
  UserDocument
} from "../src/db/types.js";
import type {
  ReceivedEmailContent,
  ResendClient,
  ResendDomain,
  SendEmailInput
} from "../src/services/resendClient.js";
import type { AppDependencies } from "../src/types.js";
import { loadConfig } from "../src/config.js";

type AnyDocument =
  | UserDocument
  | DomainDocument
  | EmailDocument
  | ThreadDocument
  | RateLimitDocument;

type UpdateDocument = {
  $set?: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
  $inc?: Record<string, number>;
  $max?: Record<string, unknown>;
  $addToSet?: Record<string, { $each: unknown[] } | unknown>;
};

export class FakeCollection<T extends AnyDocument> {
  readonly documents: WithId<T>[] = [];

  async createIndex(): Promise<string> {
    return "ok";
  }

  async findOne(filter: Filter<T>): Promise<WithId<T> | null> {
    return this.documents.find((document) => matches(document, filter)) ?? null;
  }

  find(filter: Filter<T>) {
    let results = this.documents.filter((document) => matches(document, filter));

    return {
      sort: (sortSpec: Record<string, 1 | -1>) => {
        const [[field, direction]] = Object.entries(sortSpec);
        results = [...results].sort((left, right) => {
          const leftValue = getValue(left as unknown as Record<string, unknown>, field);
          const rightValue = getValue(right as unknown as Record<string, unknown>, field);

          if (compareValues(leftValue, rightValue) < 0) {
            return direction === 1 ? -1 : 1;
          }

          if (compareValues(leftValue, rightValue) > 0) {
            return direction === 1 ? 1 : -1;
          }

          return 0;
        });

        return {
          limit: (limit: number) => ({
            toArray: async () => results.slice(0, limit)
          }),
          toArray: async () => results
        };
      },
      limit: (limit: number) => ({
        toArray: async () => results.slice(0, limit)
      }),
      toArray: async () => results
    };
  }

  async insertOne(document: OptionalUnlessRequiredId<T>): Promise<{ insertedId: ObjectId }> {
    const inserted = {
      ...document,
      _id:
        "_id" in document && document._id instanceof ObjectId
          ? document._id
          : new ObjectId()
    } as WithId<T>;
    this.documents.push(inserted);
    return { insertedId: inserted._id };
  }

  async updateOne(
    filter: Filter<T>,
    update: UpdateDocument,
    options: { upsert?: boolean } = {}
  ): Promise<{ upsertedId?: ObjectId; matchedCount: number }> {
    const existing = await this.findOne(filter);

    if (existing) {
      applyUpdate(existing, update, false);
      return { matchedCount: 1 };
    }

    if (!options.upsert) {
      return { matchedCount: 0 };
    }

    const inserted = {
      _id: new ObjectId(),
      ...extractEqualityFilter(filter),
      ...(update.$setOnInsert ?? {}),
      ...(update.$set ?? {})
    } as WithId<T>;

    this.documents.push(inserted);
    return { matchedCount: 0, upsertedId: inserted._id };
  }

  async findOneAndUpdate(
    filter: Filter<T>,
    update: UpdateDocument
  ): Promise<WithId<T> | null> {
    const existing = await this.findOne(filter);

    if (!existing) {
      return null;
    }

    applyUpdate(existing, update, false);
    return existing;
  }
}

export class FakeResendClient implements ResendClient {
  domains: ResendDomain[] = [
    { id: "domain_1", name: "example.com", status: "verified" }
  ];
  receivedEmail?: ReceivedEmailContent;
  sendCalls: SendEmailInput[] = [];

  async listDomains(): Promise<ResendDomain[]> {
    return this.domains;
  }

  async sendEmail(input: SendEmailInput): Promise<{ id: string }> {
    this.sendCalls.push(input);
    return { id: `email_${this.sendCalls.length}` };
  }

  async retrieveReceivedEmail(): Promise<ReceivedEmailContent> {
    if (!this.receivedEmail) {
      throw new Error("receivedEmail fixture missing");
    }

    return this.receivedEmail;
  }
}

export function createTestDependencies(): AppDependencies & {
  fakeCollections: {
    users: FakeCollection<UserDocument>;
    domains: FakeCollection<DomainDocument>;
    emails: FakeCollection<EmailDocument>;
    threads: FakeCollection<ThreadDocument>;
    rateLimits: FakeCollection<RateLimitDocument>;
  };
  resendClient: FakeResendClient;
} {
  const resendClient = new FakeResendClient();
  const fakeCollections = {
    users: new FakeCollection<UserDocument>(),
    domains: new FakeCollection<DomainDocument>(),
    emails: new FakeCollection<EmailDocument>(),
    threads: new FakeCollection<ThreadDocument>(),
    rateLimits: new FakeCollection<RateLimitDocument>()
  };
  const collections = fakeCollections as unknown as Collections;

  return {
    config: loadConfig({
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://localhost:27017/test",
      MONGODB_DB_NAME: "test",
      WEBHOOK_SECRET: "test_webhook_secret",
      API_KEY_ENCRYPTION_SECRET: "test-encryption-secret",
      SEND_RATE_LIMIT_WINDOW_MS: "60000",
      SEND_RATE_LIMIT_MAX: "30"
    }),
    collections,
    fakeCollections,
    resendClient
  };
}

function applyUpdate<T extends AnyDocument>(
  document: WithId<T>,
  update: UpdateDocument,
  isInsert: boolean
): void {
  if (isInsert && update.$setOnInsert) {
    Object.assign(document, update.$setOnInsert);
  }

  if (update.$set) {
    Object.assign(document, update.$set);
  }

  if (update.$inc) {
    for (const [field, amount] of Object.entries(update.$inc)) {
      const current =
        (getValue(document as unknown as Record<string, unknown>, field) as
          | number
          | undefined) ?? 0;
      setValue(
        document as unknown as Record<string, unknown>,
        field,
        current + amount
      );
    }
  }

  if (update.$max) {
    for (const [field, candidate] of Object.entries(update.$max)) {
      const current = getValue(
        document as unknown as Record<string, unknown>,
        field
      );

      if (compareValues(candidate, current) > 0) {
        setValue(
          document as unknown as Record<string, unknown>,
          field,
          candidate
        );
      }
    }
  }

  if (update.$addToSet) {
    for (const [field, value] of Object.entries(update.$addToSet)) {
      const current =
        (getValue(document as unknown as Record<string, unknown>, field) ??
          []) as unknown[];
      const values =
        value && typeof value === "object" && "$each" in value
          ? (value.$each as unknown[])
          : [value];

      for (const item of values) {
        if (!current.includes(item)) {
          current.push(item);
        }
      }

      setValue(document as unknown as Record<string, unknown>, field, current);
    }
  }
}

function matches<T extends AnyDocument>(document: WithId<T>, filter: Filter<T>): boolean {
  return Object.entries(filter).every(([field, expected]) => {
    const actual = getValue(document as unknown as Record<string, unknown>, field);

    if (expected instanceof ObjectId) {
      return actual instanceof ObjectId && actual.equals(expected);
    }

    if (expected && typeof expected === "object" && "$lt" in expected) {
      return compareValues(actual, expected.$lt) < 0;
    }

    if (expected && typeof expected === "object" && "$gte" in expected) {
      return compareValues(actual, expected.$gte) >= 0;
    }

    if (expected && typeof expected === "object" && "$in" in expected) {
      return (expected.$in as unknown[]).some((value) => value === actual);
    }

    return actual === expected;
  });
}

function extractEqualityFilter<T extends AnyDocument>(
  filter: Filter<T>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => {
      return !(value && typeof value === "object" && !(value instanceof ObjectId));
    })
  );
}

function getValue(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (Array.isArray(value)) {
      return value.map((item) => (item as Record<string, unknown>)?.[key]);
    }

    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, source);
}

function setValue(source: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = source;

  for (const part of parts.slice(0, -1)) {
    cursor[part] = (cursor[part] ?? {}) as Record<string, unknown>;
    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[parts.at(-1)!] = value;
}

function compareValues(left: unknown, right: unknown): number {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  const leftString = String(left ?? "");
  const rightString = String(right ?? "");

  return leftString.localeCompare(rightString);
}
