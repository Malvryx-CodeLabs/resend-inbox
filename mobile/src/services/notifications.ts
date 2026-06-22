import * as Clipboard from "expo-clipboard";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import type { createInboxClient } from "@/api/client";

const mailChannelId = "mail";
const copyCodeCategoryId = "copy_code";
const copyCodeActionId = "copy_code";

type InboxClient = ReturnType<typeof createInboxClient>;

interface NotificationData {
  thread_id?: unknown;
  otp_code?: unknown;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function configureNotificationInteractions(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(mailChannelId, {
    name: "Mail",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: "#2dd4bf"
  });

  await Notifications.setNotificationCategoryAsync(copyCodeCategoryId, [
    {
      identifier: copyCodeActionId,
      buttonTitle: "Copy",
      options: {
        opensAppToForeground: true
      }
    }
  ]);
}

export function listenForNotificationResponses() {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      void handleNotificationResponse(response);
    }
  );

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) {
        void handleNotificationResponse(response);
      }
    })
    .catch(() => {});

  return subscription;
}

export async function registerForBackendPush(
  client: InboxClient | null
): Promise<string | null> {
  if (!client || Platform.OS !== "android" || !Device.isDevice) {
    return null;
  }

  await configureNotificationInteractions();

  const existing = await Notifications.getPermissionsAsync();
  const finalPermission = isGrantedPermission(existing)
    ? existing
    : await Notifications.requestPermissionsAsync();

  if (!isGrantedPermission(finalPermission)) {
    return null;
  }

  const token = await Notifications.getDevicePushTokenAsync();

  if (token.type !== "android" || typeof token.data !== "string") {
    return null;
  }

  await client.registerDevice({
    token: token.data,
    platform: "android",
    device_name: Device.deviceName ?? undefined
  });

  return token.data;
}

export async function removeBackendPushToken(
  client: InboxClient | null,
  token: string | null
): Promise<void> {
  if (!client || !token) {
    return;
  }

  await client.removeDevice(token);
}

function isGrantedPermission(value: unknown): boolean {
  const permission = value as { granted?: boolean; status?: string };
  return permission.granted === true || permission.status === "granted";
}

async function handleNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<void> {
  const data = response.notification.request.content.data as NotificationData;
  const code = typeof data.otp_code === "string" ? data.otp_code : "";

  if (response.actionIdentifier === copyCodeActionId && code) {
    await Clipboard.setStringAsync(code);
  }

  const threadId = typeof data.thread_id === "string" ? data.thread_id : "";

  if (threadId) {
    router.push({
      pathname: "/thread/[threadId]",
      params: { threadId }
    });
  }
}
