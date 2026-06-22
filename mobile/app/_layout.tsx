import "react-native-gesture-handler";
import "@/../global.css";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import {
  configureNotificationInteractions,
  listenForNotificationResponses
} from "@/services/notifications";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SessionProvider>
          <ToastProvider>
            <AuthGate />
            <ThemedStatusBar />
          </ToastProvider>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void configureNotificationInteractions();
    const subscription = listenForNotificationResponses();

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    SplashScreen.hideAsync().catch(() => {});

    const inTabs = segments[0] === "(tabs)";
    const inThread = segments[0] === "thread";
    const inCompose = segments[0] === "compose";

    if (status === "signed_out" && (inTabs || inThread || inCompose)) {
      router.replace("/");
    }

    if (status === "signed_in" && !inTabs && !inThread && !inCompose) {
      router.replace("/(tabs)");
    }
  }, [router, segments, status]);

  return <AnimatedRoutes />;
}

function AnimatedRoutes() {
  const { isDark } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
        animationDuration: 180,
        contentStyle: {
          backgroundColor: isDark ? "#000000" : "#fafafa"
        }
      }}
    />
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();

  return <StatusBar style={isDark ? "light" : "dark"} />;
}
