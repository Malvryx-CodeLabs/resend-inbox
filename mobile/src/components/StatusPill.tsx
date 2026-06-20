import { Text, View } from "react-native";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react-native";

interface StatusPillProps {
  label: string;
  tone: "ok" | "warn" | "loading";
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const Icon =
    tone === "ok" ? CheckCircle2 : tone === "warn" ? CircleAlert : Loader2;
  const color = tone === "ok" ? "#0f766e" : tone === "warn" ? "#d64a2f" : "#2f6fbd";

  return (
    <View className="flex-row items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5">
      <Icon size={15} color={color} />
      <Text className="text-sm font-semibold text-ink">{label}</Text>
    </View>
  );
}
