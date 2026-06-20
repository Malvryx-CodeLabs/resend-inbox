import type { EmailAddress, EmailSummary } from "@/api/types";

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
