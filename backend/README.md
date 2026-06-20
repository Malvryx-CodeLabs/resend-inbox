# Resend Inbox Backend

Stateless TypeScript API for the Resend Inbox mobile app.

## Required Environment

Copy `.env.example` to `.env` and set:

- `MONGODB_URI`
- `API_KEY_ENCRYPTION_SECRET`
- `SERVER_REGISTRATION_KEY`
- `PUBLIC_BACKEND_URL`

`WEBHOOK_SECRET` is optional legacy single-user webhook support. The hosted/global flow uses per-user webhook setup and encrypted per-user webhook signing secrets.

`SERVER_REGISTRATION_KEY` controls who can register mobile sessions on this backend. For self-hosted deployments, keep it private and share it only with users allowed to use your server.

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

`POST /sessions` validates the backend registration key and a Resend API key, stores the Resend key encrypted, syncs verified domains, and returns an app session token. Mobile clients use that app session token as the bearer token for inbox, send, reply, webhook setup, and deletion.

## Webhook Flow

`GET /webhooks/setup` returns a unique webhook URL for the authenticated user:

```txt
https://api.resendinbox.qzz.io/webhook/resend/whk_random
```

The user adds that URL to Resend and copies the webhook signing secret into the app once. `POST /webhooks/setup` sends that signing secret to the backend, where it is stored encrypted.

## Account Deletion

`DELETE /me` removes the user, domains, email records, threads, webhook config, and rate-limit state from the backend.
