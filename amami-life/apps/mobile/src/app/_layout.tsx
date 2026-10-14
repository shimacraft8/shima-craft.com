import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ModelProvider, useApp } from "../state";
import { WeatherProvider } from "../weather";
import { Icon } from "../ui";
function Navigation() {
  const { colors: c, prefs, goToday } = useApp();
  return (
    <>
      <StatusBar style={prefs.theme === "ink" ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.ink,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: {
            backgroundColor: c.paper,
            borderTopColor: c.hair,
            minHeight: 76,
          },
          tabBarItemStyle: { minHeight: 56 },
          tabBarLabelStyle: { fontSize: 11, marginBottom: 8 },
          sceneStyle: { backgroundColor: c.paper },
        }}
      >
        {[
          ["index", "今日", "today"],
          ["explore", "探す", "explore"],
          ["move", "移動", "move"],
          ["safety", "防災", "safety"],
          ["more", "その他", "more"],
        ].map(([name, title, icon]) => (
          <Tabs.Screen
            key={name}
            name={name}
            listeners={name === "index" ? { tabPress: goToday } : undefined}
            options={{
              title,
              tabBarIcon: ({ color }) => <Icon name={icon} color={color} />,
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <ModelProvider>
        <WeatherProvider>
          <Navigation />
        </WeatherProvider>
      </ModelProvider>
    </SafeAreaProvider>
  );
}
