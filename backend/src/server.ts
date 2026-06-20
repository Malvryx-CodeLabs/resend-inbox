import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { connectDatabase } from "./db/mongo.js";
import { HttpResendClient } from "./services/resendClient.js";

const config = loadConfig();
const database = await connectDatabase(config.MONGODB_URI, config.MONGODB_DB_NAME);
const app = createApp({
  config,
  collections: database.collections,
  resendClient: new HttpResendClient()
});

const server = app.listen(config.PORT, () => {
  console.log(`Resend Inbox Backend listening on port ${config.PORT}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);
  server.close(async () => {
    await database.client.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
