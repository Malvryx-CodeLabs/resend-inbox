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
  const source = email.text || stripHtml(email.html ?? "");
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

export function detectOtp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/\b\d{4,8}\b/);
  return match?.[0] ?? null;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}
