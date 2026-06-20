import type { ObjectId } from "mongodb";
import type { AppConfig } from "../config.js";
import type { Collections } from "../db/mongo.js";
import { HttpError } from "../errors.js";

export async function enforceSendRateLimit(
  collections: Collections,
  config: AppConfig,
  userId: ObjectId
): Promise<void> {
  const now = new Date();
  const key = `send:${userId.toHexString()}`;
  const windowStart = new Date(now.getTime() - config.SEND_RATE_LIMIT_WINDOW_MS);
  const expiresAt = new Date(now.getTime() + config.SEND_RATE_LIMIT_WINDOW_MS * 2);
  const incremented = await collections.rateLimits.findOneAndUpdate(
    {
      key,
      windowStart: { $gte: windowStart },
      count: { $lt: config.SEND_RATE_LIMIT_MAX }
    },
    {
      $inc: { count: 1 },
      $set: { expiresAt }
    },
    { returnDocument: "after" }
  );

  if (incremented) {
    return;
  }

  const existing = await collections.rateLimits.findOne({ key });

  if (existing && existing.windowStart >= windowStart) {
    throw new HttpError(429, "rate_limited", "Send rate limit exceeded");
  }

  try {
    await collections.rateLimits.updateOne(
      { key },
      {
        $set: {
          key,
          count: 1,
          windowStart: now,
          expiresAt
        }
      },
      { upsert: true }
    );
  } catch {
    const retried = await collections.rateLimits.findOneAndUpdate(
      {
        key,
        windowStart: { $gte: windowStart },
        count: { $lt: config.SEND_RATE_LIMIT_MAX }
      },
      {
        $inc: { count: 1 },
        $set: { expiresAt }
      },
      { returnDocument: "after" }
    );

    if (!retried) {
      throw new HttpError(429, "rate_limited", "Send rate limit exceeded");
    }
  }
}
