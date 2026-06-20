import type {
  ApiItem,
  ApiList,
  AuthValidateResponse,
  EmailSummary,
  HealthResponse,
  MetaResponse,
  ThreadSummary
} from "./types";

export const hostedBackendUrl = "https://api.resend-inbox.dev";

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
  const [health, meta] = await Promise.all([
    request<HealthResponse>(normalized, "/health"),
    request<MetaResponse>(normalized, "/meta")
  ]);

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

export async function validateApiKey(
  baseUrl: string,
  apiKey: string
): Promise<AuthValidateResponse> {
  return request<AuthValidateResponse>(baseUrl, "/auth/validate", {
    method: "POST",
    body: {
      api_key: apiKey
    }
  });
}

export function createInboxClient(baseUrl: string, apiKey: string) {
  return {
    listEmails: () =>
      request<ApiList<EmailSummary>>(baseUrl, "/emails", {
        apiKey
      }),
    getEmail: (id: string) =>
      request<ApiItem<EmailSummary>>(baseUrl, `/emails/${encodeURIComponent(id)}`, {
        apiKey
      }),
    listThreads: () =>
      request<ApiList<ThreadSummary>>(baseUrl, "/threads", {
        apiKey
      }),
    listThreadEmails: (threadId: string) =>
      request<ApiList<EmailSummary>>(
        baseUrl,
        `/threads/${encodeURIComponent(threadId)}/emails`,
        { apiKey }
      ),
    send: (payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
    }) =>
      request<{ id: string; data: EmailSummary }>(baseUrl, "/send", {
        method: "POST",
        apiKey,
        body: payload
      }),
    reply: (payload: { email_id: string; from: string; text: string }) =>
      request<{ id: string; data: EmailSummary }>(baseUrl, "/reply", {
        method: "POST",
        apiKey,
        body: payload
      })
  };
}

async function request<T>(
  baseUrl: string,
  path: string,
  options: {
    method?: "GET" | "POST";
    apiKey?: string;
    body?: unknown;
  } = {}
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {})
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
