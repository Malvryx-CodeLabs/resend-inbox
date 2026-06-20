import type { AppConfig } from "./config.js";
import type { Collections } from "./db/mongo.js";
import type { ResendClient } from "./services/resendClient.js";

export interface AppDependencies {
  config: AppConfig;
  collections: Collections;
  resendClient: ResendClient;
}
