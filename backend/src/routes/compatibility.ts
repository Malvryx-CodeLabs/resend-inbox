import { Router } from "express";
import { serviceMeta, serviceVersion } from "../constants.js";

export function compatibilityRouter(): Router {
  const router = Router();

  router.get("/", (_request, response) => {
    response.type("html").send(statusPageHtml());
  });

  router.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "resend-inbox-backend",
      version: serviceVersion
    });
  });

  router.get("/ready", (_request, response) => {
    response.json({
      status: "ok",
      service: "resend-inbox-backend",
      version: serviceVersion
    });
  });

  router.get("/meta", (_request, response) => {
    response.json(serviceMeta);
  });

  return router;
}

function statusPageHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Resend Inbox Backend</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #000000;
        --panel: #09090b;
        --panel-2: #111113;
        --border: #27272a;
        --text: #f8fafc;
        --muted: #a1a1aa;
        --accent: #2dd4bf;
        --accent-soft: rgba(45, 212, 191, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        display: grid;
        place-items: center;
        padding: 32px 18px;
      }

      main {
        width: min(720px, 100%);
        border: 1px solid var(--border);
        background: linear-gradient(180deg, var(--panel), var(--panel-2));
        border-radius: 18px;
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      }

      .top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
      }

      .mark {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: var(--accent);
        color: #000;
        display: grid;
        place-items: center;
        font-weight: 900;
        font-size: 22px;
      }

      h1 {
        margin: 18px 0 8px;
        font-size: clamp(30px, 6vw, 52px);
        line-height: 1;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(45, 212, 191, 0.28);
        background: var(--accent-soft);
        color: var(--accent);
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: 800;
        white-space: nowrap;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 18px var(--accent);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 28px;
      }

      .tile {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.025);
      }

      .label {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .value {
        display: block;
        margin-top: 8px;
        font-size: 16px;
        font-weight: 900;
      }

      .links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 26px;
      }

      a {
        color: var(--text);
        text-decoration: none;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        font-weight: 800;
      }

      a:hover {
        border-color: var(--accent);
      }

      @media (max-width: 640px) {
        main {
          padding: 22px;
          border-radius: 14px;
        }

        .top {
          flex-direction: column;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="top">
        <div class="mark">RI</div>
        <div class="pill"><span class="dot"></span>Backend Online</div>
      </div>

      <h1>Resend Inbox Backend</h1>
      <p>
        Stateless API layer for Resend Inbox. This server is ready for mobile
        clients, per-user sessions, sending, inbound webhooks, and threaded mail.
      </p>

      <section class="grid" aria-label="Service status">
        <div class="tile">
          <span class="label">Status</span>
          <span class="value">ok</span>
        </div>
        <div class="tile">
          <span class="label">Service</span>
          <span class="value">resend-inbox-backend</span>
        </div>
        <div class="tile">
          <span class="label">Version</span>
          <span class="value">${serviceVersion}</span>
        </div>
      </section>

      <nav class="links" aria-label="Backend endpoints">
        <a href="/health">Health JSON</a>
        <a href="/ready">Readiness JSON</a>
        <a href="/meta">Compatibility JSON</a>
      </nav>
    </main>
  </body>
</html>`;
}
