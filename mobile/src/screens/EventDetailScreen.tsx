import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { eventsApi } from "../api/events";
import { getApiErrorDetail } from "../lib/errors";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { EventDetail, Schedule } from "../types/api";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "EventDetail">;

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { eventId } = params;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eventsApi.getById(eventId);
      setEvent(data);
    } catch (e) {
      setError(getApiErrorDetail(e));
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: event?.title ?? "Мероприятие",
    });
  }, [navigation, event?.title]);

  if (loading && !event) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? "Не найдено"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const openSchedules: Schedule[] = event.schedules.filter(
    (s) => s.status === "open" && s.available_slots > 0,
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {event.cover_image_url ? (
          <Image source={{ uri: event.cover_image_url }} style={styles.cover} />
        ) : null}

        <View style={styles.block}>
          <Text style={styles.price}>{event.base_price} ₽</Text>
          {event.duration_minutes ? (
            <Text style={styles.meta}>Длительность: {event.duration_minutes} мин.</Text>
          ) : null}
          {event.meeting_point ? (
            <Text style={styles.meta}>Адрес встречи: {event.meeting_point}</Text>
          ) : null}
          {event.description ? (
            <Text style={styles.desc}>{event.description}</Text>
          ) : null}
        </View>

        <Text style={styles.h2}>Сеансы</Text>
        {openSchedules.length === 0 ? (
          <Text style={styles.muted}>Нет доступных сеансов для записи.</Text>
        ) : (
          openSchedules.map((s) => (
            <View key={s.id} style={styles.session}>
              <Text style={styles.sessionWhen}>{formatWhen(s.start_datetime)}</Text>
              <Text style={styles.sessionMeta}>
                Свободно мест: {s.available_slots}
              </Text>
              <Pressable
                style={styles.bookBtn}
                onPress={() =>
                  navigation.navigate("Booking", { scheduleId: s.id })
                }
              >
                <Text style={styles.bookBtnText}>Забронировать</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scroll: { paddingBottom: 32 },
  cover: { width: "100%", height: 200, backgroundColor: "#ddd" },
  block: { padding: 16, backgroundColor: colors.card },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },
  meta: { fontSize: 15, color: colors.text, marginBottom: 6 },
  desc: { fontSize: 15, color: colors.muted, marginTop: 8, lineHeight: 22 },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
  },
  muted: { paddingHorizontal: 16, color: colors.muted },
  session: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionWhen: { fontSize: 16, fontWeight: "700", color: colors.text },
  sessionMeta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  bookBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookBtnText: { color: "#fff", fontWeight: "700" },
  error: { color: colors.error, textAlign: "center", marginBottom: 12 },
  retry: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
