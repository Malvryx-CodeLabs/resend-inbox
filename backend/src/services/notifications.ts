import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type Credential,
  type ServiceAccount
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import type { Filter, WithId } from "mongodb";
import type { AppConfig } from "../config.js";
import type { Collections } from "../db/mongo.js";
import type { DeviceTokenDocument, EmailDocument } from "../db/types.js";

const copyCodeCategory = "copy_code";

export interface NotificationService {
  configured: boolean;
  sendInboundEmailNotification: (email: EmailDocument) => Promise<void>;
}

export class DisabledNotificationService implements NotificationService {
  configured = false;

  async sendInboundEmailNotification(): Promise<void> {
    return;
  }
}

export class FirebaseNotificationService implements NotificationService {
  configured = true;

  constructor(
    private readonly collections: Collections,
    private readonly messaging: Messaging
  ) {}

  async sendInboundEmailNotification(email: EmailDocument): Promise<void> {
    const devices = await this.collections.deviceTokens
      .find({ userId: email.userId, platform: "android" })
      .toArray();

    if (devices.length === 0) {
      return;
    }

    const otp = detectOtp([email.text, stripHtml(email.html)].filter(Boolean).join(" "));
    const recipient = email.to[0]?.email ?? email.domain;
    const body = otp
      ? `Code detected from ${email.from.email} for ${recipient}`
      : previewText(email);
    const data = cleanData({
      type: "inbound_email",
      email_id: email._id.toHexString(),
      thread_id: email.threadId,
      subject: email.subject,
      from: email.from.email,
      to: recipient,
      otp_code: otp ?? "",
      categoryId: otp ? copyCodeCategory : ""
    });

    const responses = await Promise.allSettled(
      devices.map((device) =>
        this.messaging.send({
          token: device.token,
          notification: {
            title: email.subject || "New email",
            body
          },
          data,
          android: {
            priority: "high",
            notification: {
              channelId: "mail",
              clickAction: "OPEN_THREAD"
            }
          }
        })
      )
    );

    await removeInvalidTokens(this.collections, devices, responses);
  }
}

export function createNotificationService(
  config: AppConfig,
  collections: Collections
): NotificationService {
  const credential = resolveFirebaseCredential(config);

  if (!credential) {
    return new DisabledNotificationService();
  }

  const app = getApps()[0] ?? initializeApp({ credential });
  return new FirebaseNotificationService(collections, getMessaging(app));
}

function resolveFirebaseCredential(
  config: AppConfig
): Credential | null {
  if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields");
    }

    return cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key)
    } satisfies ServiceAccount);
  }

  if (
    config.FIREBASE_PROJECT_ID &&
    config.FIREBASE_CLIENT_EMAIL &&
    config.FIREBASE_PRIVATE_KEY
  ) {
    return cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(config.FIREBASE_PRIVATE_KEY)
    } satisfies ServiceAccount);
  }

  if (config.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  return null;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function cleanData(data: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value.length > 0)
  );
}

async function removeInvalidTokens(
  collections: Collections,
  devices: WithId<DeviceTokenDocument>[],
  responses: PromiseSettledResult<string>[]
): Promise<void> {
  const invalidTokens = devices
    .filter((_, index) => isInvalidTokenError(responses[index]))
    .map((device) => device.token);

  if (invalidTokens.length === 0) {
    return;
  }

  await collections.deviceTokens.deleteMany({
    token: { $in: invalidTokens }
  } as Filter<DeviceTokenDocument>);
}

function isInvalidTokenError(result: PromiseSettledResult<string>): boolean {
  if (result.status === "fulfilled") {
    return false;
  }

  const error = result.reason as { code?: string };
  return [
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered"
  ].includes(error.code ?? "");
}

function detectOtp(value: string): string | null {
  const match = value.match(/\b\d{4,8}\b/);
  return match?.[0] ?? null;
}

function previewText(email: EmailDocument): string {
  return [email.text, stripHtml(email.html)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || `New message from ${email.from.email}`;
}

function stripHtml(value: string | undefined): string {
  return value?.replace(/<[^>]*>/g, " ") ?? "";
}
