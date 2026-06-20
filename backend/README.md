# Resend Inbox Backend

Stateless TypeScript API for the Resend Inbox mobile app.

## Required Environment

Copy `.env.example` to `.env` and set:

- `MONGODB_URI`
- `WEBHOOK_SECRET`
- `API_KEY_ENCRYPTION_SECRET`

`RESEND_API_KEY` is optional for future server-wide maintenance tasks. Per-user sending and inbound retrieval use encrypted user Resend API keys.

## Scripts

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

## Compatibility Endpoints

- `GET /health`
- `GET /meta`

## Auth Flow

`POST /auth/validate` validates a Resend API key, stores it encrypted, syncs verified domains, and returns domain metadata. Mobile clients should then send that same Resend API key as a bearer token for inbox, send, and reply endpoints.
