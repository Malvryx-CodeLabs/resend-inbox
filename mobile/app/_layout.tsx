import "react-native-gesture-handler";
import "@/../global.css";
import { Slot, SplashScreen, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SessionProvider, useSession } from "@/context/SessionContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <AuthGate />
        <StatusBar style="light" />
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();

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

  return <Slot />;
}
