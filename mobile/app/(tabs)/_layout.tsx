import { Tabs } from "expo-router";
import { Inbox, PenSquare, Settings } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

export default function TabsLayout() {
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "shift",
        tabBarActiveTintColor: "#2dd4bf",
        tabBarInactiveTintColor: isDark ? "#71717a" : "#52525b",
        tabBarStyle: {
          backgroundColor: isDark ? "#000000" : "#ffffff",
          borderTopColor: isDark ? "#27272a" : "#e4e4e7",
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: "#000000",
          shadowOpacity: isDark ? 0.25 : 0.08,
          shadowRadius: 18,
          elevation: 12
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700"
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: "Compose",
          tabBarIcon: ({ color, size }) => <PenSquare color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
