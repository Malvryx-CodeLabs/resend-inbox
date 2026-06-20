import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { EmailAddress } from "../db/types.js";

export const emailAddressSchema = z.string().email().transform((value) => value.toLowerCase());
type EmailAddressInput = string | { email: string; name?: string };

export function getDomainFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error("Invalid email address");
  }

  return normalized.slice(atIndex + 1);
}

export function normalizeEmailAddress(value: EmailAddressInput): EmailAddress {
  if (typeof value === "string") {
    return { email: value.trim().toLowerCase() };
  }

  return {
    email: value.email.trim().toLowerCase(),
    name: value.name?.trim() || undefined
  };
}

export function normalizeEmailAddresses(
  value: EmailAddressInput | EmailAddressInput[] | undefined
): EmailAddress[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.map(normalizeEmailAddress);
}

export function formatAddress(address: EmailAddress): string {
  if (!address.name) {
    return address.email;
  }

  return `${address.name} <${address.email}>`;
}

export function createThreadId(subject: string, participants: string[]): string {
  const normalizedSubject = normalizeSubject(subject);
  const normalizedParticipants = participants
    .map((participant) => participant.toLowerCase())
    .sort()
    .join(",");
  const digest = createHash("sha256")
    .update(`${normalizedSubject}:${normalizedParticipants}`)
    .digest("hex")
    .slice(0, 32);

  return `thread_${digest || randomUUID()}`;
}

export function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fw|fwd):\s*/i, "").trim().toLowerCase();
}

export function parseReferences(headers: Record<string, string>): string[] {
  const references = headers.references ?? headers.References ?? "";
  return references.split(/\s+/).map((value) => value.trim()).filter(Boolean);
}
