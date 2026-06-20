import type { WithId } from "mongodb";
import type { EmailDocument, ThreadDocument } from "./db/types.js";

export function serializeEmail(email: WithId<EmailDocument> | EmailDocument) {
  return {
    id: email._id.toHexString(),
    domain: email.domain,
    thread_id: email.threadId,
    message_id: email.messageId,
    resend_email_id: email.resendEmailId,
    from: email.from,
    to: email.to,
    cc: email.cc,
    bcc: email.bcc,
    reply_to: email.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
    direction: email.direction,
    headers: email.headers,
    attachments: email.attachments,
    created_at: email.createdAt.toISOString()
  };
}

export function serializeThread(thread: WithId<ThreadDocument>) {
  return {
    id: thread._id.toHexString(),
    thread_id: thread.threadId,
    participants: thread.participants,
    last_message_at: thread.lastMessageAt.toISOString(),
    subject: thread.subject,
    created_at: thread.createdAt.toISOString()
  };
}
