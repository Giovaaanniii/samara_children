import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { bookingsApi } from "../api/bookings";
import { schedulesApi } from "../api/schedules";
import { useAuth } from "../context/AuthContext";
import { getApiErrorDetail } from "../lib/errors";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { BookingCreate, ScheduleBookingInfo } from "../types/api";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "Booking">;

type Row = {
  first_name: string;
  last_name: string;
  patronymic: string;
  age: string;
  is_child: boolean;
  special_notes: string;
};

const emptyRow = (): Row => ({
  first_name: "",
  last_name: "",
  patronymic: "",
  age: "",
  is_child: true,
  special_notes: "",
});

export default function BookingScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { scheduleId } = params;
  const { token, isLoading: authLoading } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleBookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      navigation.replace("Login", {
        returnTo: "Booking",
        scheduleId,
      });
    }
  }, [authLoading, token, navigation, scheduleId]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await schedulesApi.getBookingContext(scheduleId);
      setSchedule(data);
    } catch (e) {
      setError(getApiErrorDetail(e));
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [scheduleId, token]);

  useEffect(() => {
    if (token) void load();
  }, [load, token]);

  const addRow = () => {
    if (!schedule) return;
    if (rows.length >= schedule.available_slots) {
      Alert.alert("Места", "Достигнут лимит свободных мест на сеанс.");
      return;
    }
    setRows((r) => [...r, emptyRow()]);
  };

  const removeLast = () => {
    if (rows.length <= 1) return;
    setRows((r) => r.slice(0, -1));
  };

  const submit = async () => {
    if (!schedule) return;
    for (const r of rows) {
      if (!r.first_name.trim() || !r.last_name.trim()) {
        Alert.alert("Участники", "Укажите имя и фамилию для каждого участника.");
        return;
      }
    }
    const body: BookingCreate = {
      schedule_id: schedule.id,
      participants_count: rows.length,
      customer_notes: customerNotes.trim() || null,
      participants: rows.map((r) => ({
        first_name: r.first_name.trim(),
        last_name: r.last_name.trim(),
        patronymic: r.patronymic.trim() || null,
        age: r.age.trim() ? Number(r.age) : null,
        is_child: r.is_child,
        special_notes: r.special_notes.trim() || null,
      })),
    };

    setSubmitting(true);
    try {
      const { data } = await bookingsApi.create(body);
      if (data.payment_url) {
        await Linking.openURL(data.payment_url);
        navigation.popToTop();
        return;
      }
      Alert.alert("Оплата", "Сервер не вернул ссылку на оплату.");
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !token) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loading && !schedule) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !schedule) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error ?? "Ошибка"}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{schedule.event_title}</Text>
        <Text style={styles.meta}>Участников: {rows.length}</Text>

        <Text style={styles.label}>Комментарий к брони</Text>
        <TextInput
          style={styles.input}
          placeholder="Необязательно"
          value={customerNotes}
          onChangeText={setCustomerNotes}
          multiline
        />

        {rows.map((r, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>Участник {i + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="Имя"
              value={r.first_name}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = { ...next[i], first_name: t };
                setRows(next);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Фамилия"
              value={r.last_name}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = { ...next[i], last_name: t };
                setRows(next);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Отчество"
              value={r.patronymic}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = { ...next[i], patronymic: t };
                setRows(next);
              }}
            />
            <TextInput
              style={styles.input}
              placeholder="Возраст (число)"
              keyboardType="number-pad"
              value={r.age}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = { ...next[i], age: t };
                setRows(next);
              }}
            />
            <View style={styles.row}>
              <Text>Ребёнок</Text>
              <Switch
                value={r.is_child}
                onValueChange={(v) => {
                  const next = [...rows];
                  next[i] = { ...next[i], is_child: v };
                  setRows(next);
                }}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Особые отметки"
              value={r.special_notes}
              onChangeText={(t) => {
                const next = [...rows];
                next[i] = { ...next[i], special_notes: t };
                setRows(next);
              }}
            />
          </View>
        ))}

        <View style={styles.rowBtns}>
          <Pressable style={styles.secondary} onPress={addRow}>
            <Text style={styles.secondaryText}>+ Участник</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={removeLast}>
            <Text style={styles.secondaryText}>− Убрать</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.primary, submitting && styles.primaryOff]}
          disabled={submitting}
          onPress={() => void submit()}
        >
          <Text style={styles.primaryText}>
            {submitting ? "Отправка…" : "Перейти к оплате"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 12 },
  label: { fontWeight: "600", marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  card: {
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "700", marginBottom: 8, color: colors.text },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowBtns: { flexDirection: "row", gap: 12, marginBottom: 16 },
  secondary: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
  },
  secondaryText: { color: colors.primary, fontWeight: "700" },
  primary: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryOff: { opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  error: { color: colors.error, marginBottom: 12, textAlign: "center" },
  retry: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },
});
