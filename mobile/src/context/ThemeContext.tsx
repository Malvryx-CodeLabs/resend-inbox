import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { useColorScheme } from "react-native";

type ThemePreference = "system" | "light" | "dark";
type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  theme: EffectiveTheme;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const themePreferenceKey = "resend-inbox.theme-preference";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(themePreferenceKey)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const theme: EffectiveTheme =
    preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

  const setPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await AsyncStorage.setItem(themePreferenceKey, nextPreference);
  };

  const toggleTheme = async () => {
    await setPreference(theme === "dark" ? "light" : "dark");
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      isDark: theme === "dark",
      setPreference,
      toggleTheme
    }),
    [preference, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return value;
}

export function themed(isDark: boolean) {
  return {
    screen: isDark ? "bg-black" : "bg-zinc-50",
    panel: isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white",
    panelAlt: isDark ? "border-zinc-800 bg-black" : "border-zinc-200 bg-zinc-50",
    text: isDark ? "text-zinc-50" : "text-zinc-950",
    muted: isDark ? "text-zinc-400" : "text-zinc-600",
    subtle: isDark ? "text-zinc-500" : "text-zinc-500",
    border: isDark ? "border-zinc-800" : "border-zinc-200",
    active: isDark ? "active:bg-zinc-900" : "active:bg-zinc-100",
    iconBg: isDark ? "bg-zinc-950" : "bg-white"
  };
}
