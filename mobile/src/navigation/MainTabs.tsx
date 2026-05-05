import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import AboutScreen from "../screens/AboutScreen";
import EventsScreen from "../screens/EventsScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Главная",
          tabBarLabel: "Главная",
          tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text>,
        }}
      />
      <Tab.Screen
        name="EventsTab"
        component={EventsScreen}
        options={{
          title: "Мероприятия",
          tabBarLabel: "События",
          tabBarIcon: ({ color }) => <Text style={{ color }}>☰</Text>,
        }}
      />
      <Tab.Screen
        name="AboutTab"
        component={AboutScreen}
        options={{
          title: "О нас",
          tabBarLabel: "О нас",
          tabBarIcon: ({ color }) => <Text style={{ color }}>ⓘ</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Профиль",
          tabBarLabel: "Профиль",
          tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
