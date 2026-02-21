// src/middleware/07.cors.ts
// ─────────────────────────────────────────────────────────────
// LAYER 7 — CORS  (Cross-Origin Resource Sharing)
//
// @koa/cors handles:
//   – Preflight  OPTIONS requests (responds with 204)
//   – Allowed origins (from ALLOWED_ORIGINS env, comma-separated)
//   – Exposed headers so clients can read X-Request-ID etc.
//   – credentials: true  →  cookies & auth headers forwarded
// ─────────────────────────────────────────────────────────────

// src/middleware/07.cors.ts
import cors from "@koa/cors";
import { config } from "../config/index.ts";

export const corsMiddleware = () =>
  cors({
    origin: (ctx) => {
      const incoming = ctx.request.headers.origin;

      // Allow non-browser tools (curl, Postman)
      if (!incoming) return "*";

      // Allow whitelisted browser origins
      if (config.cors.origins.includes(incoming)) {
        return incoming;
      }

      // Explicitly block others
      return false;
    },

    credentials: true,

    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "X-Requested-With",
    ],

    exposeHeaders: [
      "X-Request-ID",
      "X-Response-Time",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],

    maxAge: 86_400,
  });