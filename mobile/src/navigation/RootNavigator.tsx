import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EventDetailScreen from "../screens/EventDetailScreen";
import BookingScreen from "../screens/BookingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { colors } from "../theme";
import MainTabs from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerBackTitle: "Назад",
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={{ title: "Мероприятие" }}
        />
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ title: "Бронирование" }}
        />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Вход" }} />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Регистрация" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
