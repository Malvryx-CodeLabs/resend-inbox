import { Pressable } from "react-native";
import { Moon, Sun } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onPress={() => {
        void toggleTheme();
      }}
      className={`h-10 w-10 items-center justify-center rounded-lg border ${
        isDark ? "border-zinc-800 bg-zinc-950 active:bg-zinc-900" : "border-zinc-200 bg-white active:bg-zinc-100"
      }`}
    >
      <Icon size={19} color={isDark ? "#f8fafc" : "#18181b"} />
    </Pressable>
  );
}
