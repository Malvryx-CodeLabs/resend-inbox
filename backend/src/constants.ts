export const serviceVersion = "1.0.0";

export const serviceMeta = {
  name: "Resend Inbox Backend",
  provider: "Malvryx-CodeLabs",
  features: {
    send: true,
    inbound: true,
    threads: true
  }
} as const;
