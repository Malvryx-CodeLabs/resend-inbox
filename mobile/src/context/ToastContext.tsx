import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { Animated, Text, View } from "react-native";
import { CheckCircle2, CircleAlert, Info } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

type ToastTone = "success" | "error" | "info";

interface ToastInput {
  title: string;
  body?: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const { isDark } = useTheme();
  const [toast, setToast] = useState<ToastInput | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (nextToast: ToastInput) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }

      setToast(nextToast);
      opacity.setValue(0);
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220
      }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true
        }).start(({ finished }) => {
          if (finished) {
            setToast(null);
          }
        });
      }, 2600);
    },
    [opacity]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const tone = toast?.tone ?? "info";
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? CircleAlert : Info;
  const iconColor = tone === "success" ? "#2dd4bf" : tone === "error" ? "#fb7185" : "#60a5fa";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" className="absolute inset-x-0 top-0 z-50 px-5 pt-14">
          <Animated.View
            style={{
              opacity,
              transform: [
                {
                  translateY: opacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0]
                  })
                }
              ]
            }}
            className={`flex-row items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
              isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
            }`}
          >
            <Icon size={18} color={iconColor} />
            <View className="min-w-0 flex-1">
              <Text className={`text-sm font-black ${isDark ? "text-zinc-50" : "text-zinc-950"}`}>
                {toast.title}
              </Text>
              {toast.body ? (
                <Text className={`mt-1 text-xs leading-4 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                  {toast.body}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return value;
}
