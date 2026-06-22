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

export function readableEmailText(email: {
  text?: string;
  html?: string;
}): string {
  return [email.text, stripHtml(email.html)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function previewEmailText(email: {
  text?: string;
  html?: string;
  from?: EmailAddress;
}): string {
  return readableEmailText(email).slice(0, 160) || `New message from ${email.from?.email ?? "unknown sender"}`;
}

export function detectOtp(email: { text?: string; html?: string } | string): string | null {
  const source = typeof email === "string" ? email : readableEmailText(email);

  if (!source) {
    return null;
  }

  const normalized = source
    .replace(/\bhttps?:\/\/\S+/gi, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const { rawCode, start } of otpCandidates(normalized)) {
    const code = rawCode.replace(/[\s-]/g, "");
    const context = normalized.slice(
      Math.max(0, start - 80),
      Math.min(normalized.length, start + rawCode.length + 80)
    );

    if (isPlausibleOtp(code) && otpKeywordPattern.test(context)) {
      return code;
    }
  }

  const standalone = normalized.match(/^[^A-Z0-9]*([A-Z0-9](?:[\s-]?[A-Z0-9]){3,7})[^A-Z0-9]*$/i);
  const code = standalone?.[1]?.replace(/[\s-]/g, "");
  return code && isPlausibleOtp(code) ? code : null;
}

export function stripHtml(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+(?:href|src)=["'][^"']*["'][^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

const numericOtpCandidatePattern = /(?:^|[^A-Z0-9])((?:\d[\s-]?){4,8})(?=$|[^A-Z0-9])/gi;
const compactOtpCandidatePattern = /(?:^|[^A-Z0-9])([A-Z0-9]{4,8})(?=$|[^A-Z0-9])/gi;
const otpKeywordPattern = /\b(?:code|otp|passcode|pin|verification|verify|login|authentication|confirmation|one[-\s]?time)\b/i;

function* otpCandidates(value: string): Generator<{ rawCode: string; start: number }> {
  for (const match of value.matchAll(numericOtpCandidatePattern)) {
    const rawCode = match[1] ?? "";
    yield {
      rawCode,
      start: (match.index ?? 0) + match[0].indexOf(rawCode)
    };
  }

  for (const match of value.matchAll(compactOtpCandidatePattern)) {
    const rawCode = match[1] ?? "";
    yield {
      rawCode,
      start: (match.index ?? 0) + match[0].indexOf(rawCode)
    };
  }
}

function isPlausibleOtp(value: string): boolean {
  return (
    /^[A-Z0-9]{4,8}$/i.test(value) &&
    /\d/.test(value) &&
    !(value.length === 8 && /[a-f]/i.test(value) && /^[a-f0-9]{8}$/i.test(value))
  );
}
