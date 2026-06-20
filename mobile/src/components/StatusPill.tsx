import { Text, View } from "react-native";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react-native";

interface StatusPillProps {
  label: string;
  tone: "ok" | "warn" | "loading";
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const Icon =
    tone === "ok" ? CheckCircle2 : tone === "warn" ? CircleAlert : Loader2;
  const color = tone === "ok" ? "#2dd4bf" : tone === "warn" ? "#fb7185" : "#60a5fa";

  return (
    <View className="flex-row items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5">
      <Icon size={15} color={color} />
      <Text className="text-sm font-semibold text-zinc-50">{label}</Text>
    </View>
  );
}
