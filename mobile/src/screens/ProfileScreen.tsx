import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GuideRatingPanel from "../components/guide/GuideRatingPanel";
import GuideSchedulePanel from "../components/guide/GuideSchedulePanel";
import ProfileGuideForm from "../components/guide/ProfileGuideForm";
import { bookingsApi } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { getApiErrorDetail } from "../lib/errors";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { BookingResponse, BookingStatus } from "../types/api";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusLabel: Record<BookingStatus, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideRefreshKey, setGuideRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await bookingsApi.my();
      setItems(data);
    } catch (e) {
      setError(getApiErrorDetail(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user?.role === "client") void load();
  }, [load, token, user?.role]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!token || !user) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.guest}>
          <Text style={styles.guestTitle}>Личный кабинет</Text>
          <Text style={styles.guestText}>Войдите, чтобы видеть бронирования.</Text>
          <Pressable
            style={styles.btn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.btnText}>Войти</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={styles.link}>Регистрация</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (user.role === "guide") {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <ScrollView contentContainerStyle={styles.guideScroll}>
          <View style={styles.header}>
            <Text style={styles.roleBadge}>Гид</Text>
            <Text style={styles.name}>
              {user.first_name || user.login}
              {user.last_name ? ` ${user.last_name}` : ""}
            </Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.row}>
              <Pressable
                style={styles.outline}
                onPress={() => setGuideRefreshKey((k) => k + 1)}
              >
                <Text style={styles.outlineText}>Обновить</Text>
              </Pressable>
              <Pressable style={styles.outline} onPress={() => void logout()}>
                <Text style={styles.outlineText}>Выйти</Text>
              </Pressable>
            </View>
          </View>
          <ProfileGuideForm />
          <GuideRatingPanel key={`r-${guideRefreshKey}`} />
          <GuideSchedulePanel key={`s-${guideRefreshKey}`} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (user.role === "admin") {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.roleBadge}>Администратор</Text>
          <Text style={styles.name}>{user.login}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Pressable style={styles.outline} onPress={() => void logout()}>
            <Text style={styles.outlineText}>Выйти</Text>
          </Pressable>
        </View>
        <View style={styles.adminBox}>
          <Text style={styles.adminText}>
            Панель администратора в мобильном приложении не реализована. Пользуйтесь
            веб-версией сайта с компьютера.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {user.first_name || user.login}
          {user.last_name ? ` ${user.last_name}` : ""}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.row}>
          <Pressable style={styles.outline} onPress={() => void load()}>
            <Text style={styles.outlineText}>Обновить</Text>
          </Pressable>
          <Pressable
            style={styles.outline}
            onPress={() => {
              void logout();
            }}
          >
            <Text style={styles.outlineText}>Выйти</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.h2}>Мои бронирования</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.event_title ?? `Бронь #${item.id}`}
              </Text>
              <Text style={styles.cardMeta}>
                {formatWhen(item.schedule_start_datetime)}
              </Text>
              <Text style={styles.status}>
                {statusLabel[item.status] ?? item.status}
              </Text>
              <Text style={styles.price}>{item.total_price} ₽</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Пока нет бронирований.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  guest: { padding: 24 },
  guestTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  guestText: { marginTop: 8, color: colors.muted, marginBottom: 20 },
  btn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800" },
  link: {
    marginTop: 16,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
  },
  header: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text },
  email: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  outline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  outlineText: { color: colors.primary, fontWeight: "700" },
  h2: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 12,
    color: colors.text,
  },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  status: { marginTop: 8, fontWeight: "600", color: colors.primary },
  price: { marginTop: 6, fontWeight: "700" },
  error: { color: colors.error, padding: 16 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 16 },
  guideScroll: { paddingBottom: 32 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    color: "#fff",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  adminBox: { padding: 20 },
  adminText: { fontSize: 15, color: colors.muted, lineHeight: 22 },
});
