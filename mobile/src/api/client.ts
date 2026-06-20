import type {
  ApiItem,
  ApiList,
  AttachmentDownload,
  CreateSessionResponse,
  EmailSummary,
  HealthResponse,
  MeResponse,
  MetaResponse,
  OutboundAttachment,
  ThreadSummary,
  WebhookSetup
} from "./types";

export const hostedBackendUrl = "https://api.resendinbox.qzz.io";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function normalizeBackendUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) {
    throw new Error("Backend URL is required");
  }

  const url = new URL(trimmed);

  if (url.protocol !== "https:" && !isLocalHttp(url)) {
    throw new Error("Use HTTPS for backend connections");
  }

  return url.toString().replace(/\/+$/, "");
}

export async function checkBackend(baseUrl: string): Promise<{
  health: HealthResponse;
  meta: MetaResponse;
}> {
  const normalized = normalizeBackendUrl(baseUrl);
  let health: HealthResponse;
  let meta: MetaResponse;

  try {
    [health, meta] = await Promise.all([
      request<HealthResponse>(normalized, "/health"),
      request<MetaResponse>(normalized, "/meta")
    ]);
  } catch {
    throw new Error("This is not a compatible Resend Inbox backend");
  }

  if (
    health.status !== "ok" ||
    health.service !== "resend-inbox-backend" ||
    meta.name !== "Resend Inbox Backend" ||
    !meta.features.send ||
    !meta.features.inbound ||
    !meta.features.threads
  ) {
    throw new Error("Backend is not compatible with Resend Inbox");
  }

  return { health, meta };
}

export async function createSession(
  baseUrl: string,
  input: {
    apiKey: string;
    registrationKey: string;
  }
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>(baseUrl, "/sessions", {
    method: "POST",
    body: {
      api_key: input.apiKey,
      registration_key: input.registrationKey
    }
  });
}

export function createInboxClient(baseUrl: string, sessionToken: string) {
  return {
    getMe: () =>
      request<MeResponse>(baseUrl, "/me", {
        sessionToken
      }),
    deleteAccount: () =>
      request<void>(baseUrl, "/me", {
        method: "DELETE",
        sessionToken
      }),
    getWebhookSetup: () =>
      request<ApiItem<WebhookSetup>>(baseUrl, "/webhooks/setup", {
        sessionToken
      }),
    saveWebhookSecret: (signingSecret: string) =>
      request<ApiItem<WebhookSetup>>(baseUrl, "/webhooks/setup", {
        method: "POST",
        sessionToken,
        body: {
          signing_secret: signingSecret
        }
      }),
    listEmails: () =>
      request<ApiList<EmailSummary>>(baseUrl, "/emails", {
        sessionToken
      }),
    getEmail: (id: string) =>
      request<ApiItem<EmailSummary>>(baseUrl, `/emails/${encodeURIComponent(id)}`, {
        sessionToken
      }),
    getAttachmentDownload: (emailId: string, attachmentId: string) =>
      request<ApiItem<AttachmentDownload>>(
        baseUrl,
        `/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
        {
          sessionToken
        }
      ),
    listThreads: () =>
      request<ApiList<ThreadSummary>>(baseUrl, "/threads", {
        sessionToken
      }),
    listThreadEmails: (threadId: string) =>
      request<ApiList<EmailSummary>>(
        baseUrl,
        `/threads/${encodeURIComponent(threadId)}/emails`,
        { sessionToken }
      ),
    send: (payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
      attachments?: OutboundAttachment[];
    }) =>
      request<{ id: string; data: EmailSummary }>(baseUrl, "/send", {
        method: "POST",
        sessionToken,
        body: payload
      }),
    reply: (payload: {
      email_id: string;
      from?: string;
      text: string;
      attachments?: OutboundAttachment[];
    }) =>
      request<{ id: string; data: EmailSummary }>(baseUrl, "/reply", {
        method: "POST",
        sessionToken,
        body: payload
      })
  };
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    sessionToken?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.sessionToken ? { authorization: `Bearer ${options.sessionToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text ? safeParseJson(text) : {};

  if (!response.ok) {
    const errorBody = body as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    throw new ApiError(
      response.status,
      errorBody.error?.code ?? "request_failed",
      errorBody.error?.message ?? `Request failed with status ${response.status}`
    );
  }

  return body as T;
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Backend returned invalid JSON");
  }
}

function isLocalHttp(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname)
  );
}
