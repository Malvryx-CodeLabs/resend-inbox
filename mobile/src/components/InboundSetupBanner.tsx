import { router } from "expo-router";
import { AlertTriangle, Settings } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/context/SessionContext";

interface InboundSetupBannerProps {
  className?: string;
  showSettingsButton?: boolean;
}

export function InboundSetupBanner({
  className,
  showSettingsButton = true
}: InboundSetupBannerProps) {
  const { webhook } = useSession();

  const message = !webhook?.url
    ? "Inbound mail is not active. Create a webhook URL to receive new messages."
    : !webhook.configured
      ? "Inbound mail is not active. Add the webhook signing secret to receive new messages."
      : null;

  if (!message) {
    return null;
  }

  return (
    <View
      className={`flex-row items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-3 ${
        className ?? ""
      }`}
    >
      <AlertTriangle size={18} color="#fbbf24" />
      <Text className="min-w-0 flex-1 text-sm font-semibold leading-5 text-zinc-50">
        {message}
      </Text>
      {showSettingsButton ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/settings")}
          className="h-8 flex-row items-center gap-1 rounded-lg bg-gold px-2 active:opacity-80"
        >
          <Settings size={14} color="#000000" />
          <Text className="text-xs font-black text-black">Settings</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
