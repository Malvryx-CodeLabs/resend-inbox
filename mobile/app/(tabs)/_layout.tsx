import { Tabs } from "expo-router";
import { Inbox, PenSquare, Settings } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#7a827b",
        tabBarStyle: {
          backgroundColor: "#f7f7f2",
          borderTopColor: "#d7ddd7",
          height: 62,
          paddingBottom: 8,
          paddingTop: 8
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
