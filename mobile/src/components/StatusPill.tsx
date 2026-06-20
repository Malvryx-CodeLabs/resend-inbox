import { Text, View } from "react-native";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

interface StatusPillProps {
  label: string;
  tone: "ok" | "warn" | "loading";
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const { isDark } = useTheme();
  const Icon =
    tone === "ok" ? CheckCircle2 : tone === "warn" ? CircleAlert : Loader2;
  const color = tone === "ok" ? "#2dd4bf" : tone === "warn" ? "#fb7185" : "#60a5fa";

  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${
        isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
      }`}
    >
      <Icon size={15} color={color} />
      <Text className={`text-sm font-semibold ${isDark ? "text-zinc-50" : "text-zinc-950"}`}>{label}</Text>
    </View>
  );
}
