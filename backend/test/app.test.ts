import { describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Webhook } from "svix";
import { createApp } from "../src/app.js";
import type { EmailDocument } from "../src/db/types.js";
import { encryptApiKey, fingerprintApiKey } from "../src/security/apiKeys.js";
import { createTestDependencies } from "./fakes.js";

describe("compatibility endpoints", () => {
  it("returns health and meta responses expected by the mobile app", async () => {
    const app = createApp(createTestDependencies());

    await request(app)
      .get("/health")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: "ok",
          service: "resend-inbox-backend",
          version: "1.0.0"
        });
      });

    await request(app)
      .get("/meta")
      .expect(200)
      .expect(({ body }) => {
        expect(body.features).toEqual({
          send: true,
          inbound: true,
          threads: true
        });
      });
  });
});

describe("auth validation", () => {
  it("validates a Resend key, stores it encrypted, and does not expose it", async () => {
    const dependencies = createTestDependencies();
    const app = createApp(dependencies);

    await request(app)
      .post("/auth/validate")
      .send({ api_key: "re_test_secret", email: "owner@example.com" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.api_key.display).toBe("re_t...cret");
        expect(JSON.stringify(body)).not.toContain("re_test_secret");
        expect(body.domains).toEqual([
          {
            id: "domain_1",
            domain: "example.com",
            verified: true,
            inbound_enabled: true
          }
        ]);
      });

    const user = dependencies.fakeCollections.users.documents[0];
    expect(user.apiKeyEncrypted).not.toContain("re_test_secret");
  });
});

describe("mail routes", () => {
  it("rejects sending from a domain that does not belong to the bearer user", async () => {
    const dependencies = createTestDependencies();
    const userId = await seedUser(dependencies, "re_test_secret", "example.com");
    const otherUserId = new ObjectId();

    await dependencies.collections.domains.insertOne({
      _id: new ObjectId(),
      userId: otherUserId,
      domain: "other.com",
      verified: true,
      inboundEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    expect(userId).toBeInstanceOf(ObjectId);

    await request(createApp(dependencies))
      .post("/send")
      .set("authorization", "Bearer re_test_secret")
      .send({
        from: "admin@other.com",
        to: "person@example.net",
        subject: "Hello",
        text: "Hello"
      })
      .expect(403);
  });

  it("sends replies with thread headers and stores them in the existing thread", async () => {
    const dependencies = createTestDependencies();
    const userId = await seedUser(dependencies, "re_test_secret", "example.com");
    const inboundId = new ObjectId();

    await dependencies.collections.emails.insertOne({
      _id: inboundId,
      userId,
      domain: "example.com",
      threadId: "thread_existing",
      messageId: "<incoming@example.net>",
      from: { email: "person@example.net" },
      to: [{ email: "admin@example.com" }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: "Question",
      text: "Hi",
      direction: "inbound",
      headers: { References: "<older@example.net>" },
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await request(createApp(dependencies))
      .post("/reply")
      .set("authorization", "Bearer re_test_secret")
      .send({
        email_id: inboundId.toHexString(),
        from: "admin@example.com",
        text: "Answer"
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data.thread_id).toBe("thread_existing");
      });

    expect(dependencies.resendClient.sendCalls[0].headers).toEqual({
      "In-Reply-To": "<incoming@example.net>",
      References: "<older@example.net> <incoming@example.net>"
    });
  });
});

describe("webhook route", () => {
  it("verifies signatures, routes inbound email to the owning user, and is idempotent", async () => {
    const dependencies = createTestDependencies();
    const userId = await seedUser(dependencies, "re_test_secret", "example.com");
    dependencies.resendClient.receivedEmail = {
      resendEmailId: "recv_1",
      messageId: "<recv-1@example.net>",
      from: { email: "person@example.net" },
      to: [{ email: "admin@example.com" }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: "Hello",
      text: "Inbound",
      headers: { "Message-ID": "<recv-1@example.net>" },
      attachments: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    };
    const payload = {
      type: "email.received",
      data: {
        id: "recv_1",
        to: [{ email: "admin@example.com" }]
      }
    };
    const payloadJson = JSON.stringify(payload);
    const timestamp = new Date();
    const headers = {
      "svix-id": "msg_test",
      "svix-timestamp": `${Math.floor(timestamp.getTime() / 1000)}`,
      "svix-signature": new Webhook(dependencies.config.WEBHOOK_SECRET, {
        format: "raw"
      }).sign("msg_test", timestamp, payloadJson)
    };
    const app = createApp(dependencies);

    await request(app)
      .post("/webhook/resend")
      .set(headers)
      .set("content-type", "application/json")
      .send(payloadJson)
      .expect(202);
    await request(app)
      .post("/webhook/resend")
      .set(headers)
      .set("content-type", "application/json")
      .send(payloadJson)
      .expect(202);

    expect(dependencies.fakeCollections.emails.documents).toHaveLength(1);
    expect(dependencies.fakeCollections.emails.documents[0].userId.equals(userId)).toBe(true);
    expect(dependencies.fakeCollections.threads.documents).toHaveLength(1);
  });
});

async function seedUser(
  dependencies: ReturnType<typeof createTestDependencies>,
  apiKey: string,
  domain: string
): Promise<ObjectId> {
  const userId = new ObjectId();
  const now = new Date();

  await dependencies.collections.users.insertOne({
    _id: userId,
    email: `owner@${domain}`,
    apiKeyEncrypted: encryptApiKey(
      apiKey,
      dependencies.config.API_KEY_ENCRYPTION_SECRET
    ),
    apiKeyFingerprint: fingerprintApiKey(
      apiKey,
      dependencies.config.API_KEY_ENCRYPTION_SECRET
    ),
    createdAt: now,
    updatedAt: now
  });
  await dependencies.collections.domains.insertOne({
    _id: new ObjectId(),
    userId,
    domain,
    verified: true,
    inboundEnabled: true,
    createdAt: now,
    updatedAt: now
  });

  return userId;
}
