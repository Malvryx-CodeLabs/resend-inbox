import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface ButtonProps extends PressableProps {
  label: string;
  icon?: LucideIcon;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const variants = {
  primary: "bg-pine",
  secondary: "bg-zinc-900",
  danger: "bg-flame",
  ghost: "bg-transparent border border-zinc-800"
};

const textVariants = {
  primary: "text-black",
  secondary: "text-white",
  danger: "text-black",
  ghost: "text-zinc-50"
};

export function Button({
  label,
  icon: Icon,
  loading,
  variant = "primary",
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-lg px-4 ${variants[variant]} ${
        isDisabled ? "opacity-55" : "active:opacity-80"
      } ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" || variant === "ghost" ? "#f8fafc" : "#000000"}
        />
      ) : (
        <>
          {Icon ? (
            <Icon
              size={18}
              color={variant === "secondary" || variant === "ghost" ? "#f8fafc" : "#000000"}
            />
          ) : null}
          <Text className={`text-base font-semibold ${textVariants[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
