import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AboutScreen from "../screens/AboutScreen";
import EventsScreen from "../screens/EventsScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 1,
        },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 3,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Главная",
          tabBarLabel: "Главная",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EventsTab"
        component={EventsScreen}
        options={{
          title: "Мероприятия",
          tabBarLabel: "События",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AboutTab"
        component={AboutScreen}
        options={{
          title: "О нас",
          tabBarLabel: "О нас",
          tabBarIcon: ({ color }) => (
            <Ionicons name="information-circle-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Профиль",
          tabBarLabel: "Профиль",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
