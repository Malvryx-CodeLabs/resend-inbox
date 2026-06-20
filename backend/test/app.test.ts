import { describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Webhook } from "svix";
import { createApp } from "../src/app.js";
import { encryptApiKey, fingerprintApiKey } from "../src/security/apiKeys.js";
import { hashToken } from "../src/security/tokens.js";
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

describe("sessions", () => {
  it("rejects registration without the server registration key", async () => {
    await request(createApp(createTestDependencies()))
      .post("/sessions")
      .send({ api_key: "re_test_secret", registration_key: "wrong" })
      .expect(403);
  });

  it("validates a Resend key, stores it encrypted, and returns an app session", async () => {
    const dependencies = createTestDependencies();

    await request(createApp(dependencies))
      .post("/sessions")
      .send({
        api_key: "re_test_secret",
        registration_key: dependencies.config.SERVER_REGISTRATION_KEY,
        email: "owner@example.com"
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.session.token).toMatch(/^ris_/);
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
    expect(user.sessionTokenHash).toBeTruthy();
  });
});

describe("mail routes", () => {
  it("rejects sending from a domain that does not belong to the session user", async () => {
    const dependencies = createTestDependencies();
    const seeded = await seedUser(dependencies, "re_test_secret", "example.com");
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

    await request(createApp(dependencies))
      .post("/send")
      .set("authorization", `Bearer ${seeded.sessionToken}`)
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
    const seeded = await seedUser(dependencies, "re_test_secret", "example.com");
    const inboundId = new ObjectId();

    await dependencies.collections.emails.insertOne({
      _id: inboundId,
      userId: seeded.userId,
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
      .set("authorization", `Bearer ${seeded.sessionToken}`)
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

describe("webhook setup and delivery", () => {
  it("creates a per-user webhook URL and verifies inbound delivery with its secret", async () => {
    const dependencies = createTestDependencies();
    const seeded = await seedUser(dependencies, "re_test_secret", "example.com");
    const app = createApp(dependencies);

    const setupResponse = await request(app)
      .get("/webhooks/setup")
      .set("authorization", `Bearer ${seeded.sessionToken}`)
      .expect(200);

    expect(setupResponse.body.data.url).toContain("/webhook/resend/whk_");
    expect(setupResponse.body.data.configured).toBe(false);

    await request(app)
      .post("/webhooks/setup")
      .set("authorization", `Bearer ${seeded.sessionToken}`)
      .send({ signing_secret: "user_webhook_secret" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.enabled).toBe(true);
        expect(body.data.configured).toBe(true);
      });

    const webhookConfig = dependencies.fakeCollections.webhookConfigs.documents[0];
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
    const payloadJson = JSON.stringify({
      type: "email.received",
      data: {
        id: "recv_1",
        to: [{ email: "admin@example.com" }]
      }
    });
    const timestamp = new Date();
    const headers = {
      "svix-id": "msg_test",
      "svix-timestamp": `${Math.floor(timestamp.getTime() / 1000)}`,
      "svix-signature": new Webhook("user_webhook_secret", {
        format: "raw"
      }).sign("msg_test", timestamp, payloadJson)
    };

    await request(app)
      .post(`/webhook/resend/${webhookConfig.webhookId}`)
      .set(headers)
      .set("content-type", "application/json")
      .send(payloadJson)
      .expect(202);

    expect(dependencies.fakeCollections.emails.documents).toHaveLength(1);
    expect(dependencies.fakeCollections.emails.documents[0].userId.equals(seeded.userId)).toBe(true);
    expect(dependencies.fakeCollections.webhookConfigs.documents[0].lastReceivedAt).toBeInstanceOf(Date);
  });
});

describe("account deletion", () => {
  it("removes the user and all tenant-scoped data from the server", async () => {
    const dependencies = createTestDependencies();
    const seeded = await seedUser(dependencies, "re_test_secret", "example.com");
    const now = new Date();

    await dependencies.collections.emails.insertOne({
      _id: new ObjectId(),
      userId: seeded.userId,
      domain: "example.com",
      threadId: "thread_1",
      messageId: "message_1",
      from: { email: "a@example.net" },
      to: [{ email: "admin@example.com" }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: "Hello",
      text: "Hi",
      direction: "inbound",
      headers: {},
      attachments: [],
      createdAt: now,
      updatedAt: now
    });
    await dependencies.collections.threads.insertOne({
      _id: new ObjectId(),
      userId: seeded.userId,
      threadId: "thread_1",
      participants: [],
      lastMessageAt: now,
      subject: "Hello",
      createdAt: now,
      updatedAt: now
    });

    await request(createApp(dependencies))
      .delete("/me")
      .set("authorization", `Bearer ${seeded.sessionToken}`)
      .expect(204);

    expect(dependencies.fakeCollections.users.documents).toHaveLength(0);
    expect(dependencies.fakeCollections.domains.documents).toHaveLength(0);
    expect(dependencies.fakeCollections.emails.documents).toHaveLength(0);
    expect(dependencies.fakeCollections.threads.documents).toHaveLength(0);
  });
});

async function seedUser(
  dependencies: ReturnType<typeof createTestDependencies>,
  apiKey: string,
  domain: string
): Promise<{ userId: ObjectId; sessionToken: string }> {
  const userId = new ObjectId();
  const now = new Date();
  const sessionToken = "ris_test_session";

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
    sessionTokenHash: hashToken(sessionToken),
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

  return { userId, sessionToken };
}
