import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  HomeTab: undefined;
  EventsTab: { q?: string } | undefined;
  AboutTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  EventDetail: { eventId: number };
  Booking: { scheduleId: number };
  Login:
    | {
        returnTo?: "Booking";
        scheduleId?: number;
      }
    | undefined;
  Register: undefined;
};
