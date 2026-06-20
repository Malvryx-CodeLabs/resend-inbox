import type { ObjectId } from "mongodb";

export type EmailDirection = "inbound" | "outbound";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  apiKeyEncrypted: string;
  apiKeyFingerprint: string;
  sessionTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainDocument {
  _id: ObjectId;
  userId: ObjectId;
  domain: string;
  verified: boolean;
  inboundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface AttachmentMetadata {
  id?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  content?: string;
  contentId?: string;
  disposition?: "attachment" | "inline";
}

export interface EmailDocument {
  _id: ObjectId;
  userId: ObjectId;
  domain: string;
  threadId: string;
  messageId: string;
  resendEmailId?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  direction: EmailDirection;
  headers: Record<string, string>;
  attachments: AttachmentMetadata[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreadDocument {
  _id: ObjectId;
  userId: ObjectId;
  threadId: string;
  participants: string[];
  lastMessageAt: Date;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitDocument {
  _id: ObjectId;
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

export interface DeviceTokenDocument {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  platform: "android";
  deviceName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface WebhookConfigDocument {
  _id: ObjectId;
  userId: ObjectId;
  webhookId: string;
  signingSecretEncrypted?: string;
  enabled: boolean;
  lastReceivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
