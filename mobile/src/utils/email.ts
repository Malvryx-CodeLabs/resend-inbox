import type { EmailAddress, EmailSummary } from "@/api/types";

export const commonAliasLocalParts = [
  "hello",
  "support",
  "admin",
  "team",
  "contact",
  "help",
  "sales",
  "billing"
];

export function addressLabel(address?: EmailAddress): string {
  if (!address) {
    return "Unknown sender";
  }

  return address.name || address.email;
}

export function previewText(email: EmailSummary): string {
  const source = readableEmailText(email);
  return source.replace(/\s+/g, " ").trim() || "No message preview";
}

export function aliasOptions(domains: string[]): string[] {
  return domains.flatMap((domain) => [
    `admin@${domain}`,
    `support@${domain}`,
    `hello@${domain}`
  ]);
}

export function normalizeAliasLocalPart(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/@.*$/, "");
}

export function isValidAliasLocalPart(value: string): boolean {
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(value.trim());
}

export function buildAliasAddress(localPart: string, domain: string): string {
  const normalizedLocalPart = normalizeAliasLocalPart(localPart);
  const normalizedDomain = domain.trim();

  if (!normalizedLocalPart || !normalizedDomain) {
    return "";
  }

  return `${normalizedLocalPart}@${normalizedDomain}`;
}

export function detectOtp(email: Pick<EmailSummary, "text" | "html"> | string | undefined): string | null {
  const value = typeof email === "string" ? email : readableEmailText(email);

  if (!value) {
    return null;
  }

  const normalized = value
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

export function readableEmailText(email: Pick<EmailSummary, "text" | "html"> | undefined): string {
  if (!email) {
    return "";
  }

  return [email.text, stripHtml(email.html)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
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
