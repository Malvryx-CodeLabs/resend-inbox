import { z } from "zod";
import type { AttachmentMetadata, EmailAddress } from "../db/types.js";
import { badRequest } from "../errors.js";
import { formatAddress, normalizeEmailAddresses } from "../utils/email.js";

const resendApiBaseUrl = "https://api.resend.com";

const resendDomainSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional()
});

const resendDomainsResponseSchema = z.object({
  data: z.array(resendDomainSchema)
});

const resendSendResponseSchema = z.object({
  id: z.string()
});

const resendAttachmentSchema = z.object({
  id: z.string(),
  filename: z.string().optional(),
  size: z.number().optional(),
  content_type: z.string().optional(),
  content_disposition: z.string().optional(),
  content_id: z.string().optional(),
  download_url: z.string().url(),
  expires_at: z.string().optional()
});

const resendReceivedEmailSchema = z
  .object({
    id: z.string(),
    object: z.string().optional(),
    from: z.union([z.string(), z.object({ email: z.string(), name: z.string().optional() })]),
    to: z.union([
      z.string(),
      z.array(z.union([z.string(), z.object({ email: z.string(), name: z.string().optional() })]))
    ]),
    cc: z
      .union([
        z.string(),
        z.array(z.union([z.string(), z.object({ email: z.string(), name: z.string().optional() })]))
      ])
      .optional(),
    bcc: z
      .union([
        z.string(),
        z.array(z.union([z.string(), z.object({ email: z.string(), name: z.string().optional() })]))
      ])
      .optional(),
    reply_to: z
      .union([
        z.string(),
        z.array(z.union([z.string(), z.object({ email: z.string(), name: z.string().optional() })]))
      ])
      .optional(),
    subject: z.string().optional(),
    html: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    created_at: z.string().optional(),
    attachments: z
      .array(
        z.object({
          id: z.string().optional(),
          filename: z.string().optional(),
          content_type: z.string().optional(),
          size: z.number().optional()
        })
      )
      .optional(),
    headers: z.record(z.string()).optional(),
    message_id: z.string().optional()
  })
  .passthrough();

export interface ResendDomain {
  id: string;
  name: string;
  status?: string;
}

export interface SendEmailInput {
  apiKey: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  subject: string;
  messageId?: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: AttachmentMetadata[];
}

export interface ReceivedEmailContent {
  resendEmailId: string;
  messageId?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  headers: Record<string, string>;
  attachments: AttachmentMetadata[];
  createdAt?: Date;
}

export interface ReceivedAttachmentContent extends AttachmentMetadata {
  downloadUrl: string;
  expiresAt?: Date;
}

export interface ResendClient {
  listDomains(apiKey: string): Promise<ResendDomain[]>;
  sendEmail(input: SendEmailInput): Promise<{ id: string }>;
  retrieveReceivedEmail(apiKey: string, emailId: string): Promise<ReceivedEmailContent>;
  retrieveReceivedAttachment(
    apiKey: string,
    emailId: string,
    attachmentId: string
  ): Promise<ReceivedAttachmentContent>;
}

export class HttpResendClient implements ResendClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = resendApiBaseUrl
  ) {}

  async listDomains(apiKey: string): Promise<ResendDomain[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/domains`, {
      headers: this.authHeaders(apiKey)
    });

    const body = await this.parseJson(response);

    if (!response.ok) {
      throw badRequest(`Resend domain validation failed: ${this.errorMessage(body)}`);
    }

    const parsed = resendDomainsResponseSchema.parse(body);
    return parsed.data.map((domain) => ({
      id: domain.id,
      name: domain.name.toLowerCase(),
      status: domain.status
    }));
  }

  async sendEmail(input: SendEmailInput): Promise<{ id: string }> {
    const response = await this.fetchImpl(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        ...this.authHeaders(input.apiKey),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: formatAddress(input.from),
        to: input.to.map(formatAddress),
        cc: input.cc.map(formatAddress),
        bcc: input.bcc.map(formatAddress),
        reply_to: input.replyTo.map(formatAddress),
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
        attachments: input.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
          content_id: attachment.contentId,
          disposition: attachment.disposition
        }))
      })
    });

    const body = await this.parseJson(response);

    if (!response.ok) {
      throw badRequest(`Resend send failed: ${this.errorMessage(body)}`);
    }

    return resendSendResponseSchema.parse(body);
  }

  async retrieveReceivedEmail(
    apiKey: string,
    emailId: string
  ): Promise<ReceivedEmailContent> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/emails/receiving/${emailId}`,
      {
        headers: this.authHeaders(apiKey)
      }
    );

    const body = await this.parseJson(response);

    if (!response.ok) {
      throw badRequest(`Resend email retrieval failed: ${this.errorMessage(body)}`);
    }

    const parsed = resendReceivedEmailSchema.parse(body);

    return {
      resendEmailId: parsed.id,
      from: normalizeEmailAddresses([parsed.from])[0],
      to: normalizeEmailAddresses(parsed.to),
      cc: normalizeEmailAddresses(parsed.cc),
      bcc: normalizeEmailAddresses(parsed.bcc),
      replyTo: normalizeEmailAddresses(parsed.reply_to),
      subject: parsed.subject ?? "",
      messageId: parsed.message_id,
      html: parsed.html ?? undefined,
      text: parsed.text ?? undefined,
      headers: parsed.headers ?? {},
      attachments:
        parsed.attachments?.map((attachment) => ({
          id: attachment.id,
          filename: attachment.filename,
          contentType: attachment.content_type,
          size: attachment.size
        })) ?? [],
      createdAt: parsed.created_at ? new Date(parsed.created_at) : undefined
    };
  }

  async retrieveReceivedAttachment(
    apiKey: string,
    emailId: string,
    attachmentId: string
  ): Promise<ReceivedAttachmentContent> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/emails/receiving/${emailId}/attachments/${attachmentId}`,
      {
        headers: this.authHeaders(apiKey)
      }
    );

    const body = await this.parseJson(response);

    if (!response.ok) {
      throw badRequest(`Resend attachment retrieval failed: ${this.errorMessage(body)}`);
    }

    const parsed = resendAttachmentSchema.parse(body);

    return {
      id: parsed.id,
      filename: parsed.filename,
      contentType: parsed.content_type,
      contentId: parsed.content_id,
      disposition:
        parsed.content_disposition === "inline" ? "inline" : "attachment",
      size: parsed.size,
      downloadUrl: parsed.download_url,
      expiresAt: parsed.expires_at ? new Date(parsed.expires_at) : undefined
    };
  }

  private authHeaders(apiKey: string): Record<string, string> {
    return {
      authorization: `Bearer ${apiKey}`
    };
  }

  private async parseJson(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw badRequest("Resend returned invalid JSON");
    }
  }

  private errorMessage(body: unknown): string {
    if (
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }

    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }

    return "request rejected";
  }
}
