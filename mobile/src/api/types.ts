export interface HealthResponse {
  status: "ok";
  service: "resend-inbox-backend";
  version: string;
}

export interface MetaResponse {
  name: "Resend Inbox Backend";
  provider: string;
  features: {
    send: boolean;
    inbound: boolean;
    threads: boolean;
    push?: boolean;
  };
}

export interface DomainSummary {
  id: string;
  domain: string;
  verified: boolean;
  inbound_enabled: boolean;
}

export interface WebhookSetup {
  webhook_id: string;
  url: string;
  enabled: boolean;
  configured: boolean;
  last_received_at: string | null;
}

export interface CreateSessionResponse {
  session: {
    token: string;
  };
  user: {
    id: string;
    email: string;
  };
  api_key: {
    fingerprint: string;
    display: string;
  };
  domains: DomainSummary[];
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
  };
  api_key: {
    display: string;
  };
  domains: DomainSummary[];
  webhook: WebhookSetup | null;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailSummary {
  id: string;
  domain: string;
  thread_id: string;
  message_id: string;
  resend_email_id?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  reply_to: EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  direction: "inbound" | "outbound";
  headers: Record<string, string>;
  attachments: Array<{
    id?: string;
    filename?: string;
    contentType?: string;
    size?: number;
    content?: string;
  }>;
  created_at: string;
}

export interface OutboundAttachment {
  filename: string;
  content: string;
  content_type?: string;
}

export interface AttachmentDownload {
  id: string;
  filename?: string;
  content_type?: string;
  content_id?: string;
  content_disposition?: string;
  size?: number;
  download_url: string;
  expires_at: string | null;
}

export interface ThreadSummary {
  id: string;
  thread_id: string;
  participants: string[];
  last_message_at: string;
  subject: string;
  created_at: string;
}

export interface ApiList<T> {
  data: T[];
}

export interface ApiItem<T> {
  data: T;
}
