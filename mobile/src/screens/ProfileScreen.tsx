import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GuideRatingPanel from "../components/guide/GuideRatingPanel";
import GuideSchedulePanel from "../components/guide/GuideSchedulePanel";
import ProfileGuideForm from "../components/guide/ProfileGuideForm";
import { authApi } from "../api/auth";
import { bookingsApi } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { getApiErrorDetail } from "../lib/errors";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { BookingDetail, BookingResponse, BookingStatus } from "../types/api";

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
  const { user, token, logout, isLoading: authLoading, setUser } = useAuth();
  const [items, setItems] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guideRefreshKey, setGuideRefreshKey] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

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

  const openDetails = async (bookingId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await bookingsApi.getById(bookingId);
      setDetail(data);
    } catch (e) {
      setDetailOpen(false);
      setDetail(null);
      setDetailLoading(false);
      setError(getApiErrorDetail(e));
      return;
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    if (token && user?.role === "client") void load();
  }, [load, token, user?.role]);

  useEffect(() => {
    if (!user || user.role !== "client") return;
    setLogin(user.login);
    setEmail(user.email);
    setFirstName(user.first_name ?? "");
    setLastName(user.last_name ?? "");
    setPatronymic(user.patronymic ?? "");
    setPhone(user.phone ?? "");
    setPassword("");
    setPassword2("");
  }, [user]);

  const saveClientProfile = async () => {
    if (password && password.length < 8) {
      setError("Новый пароль: минимум 8 символов");
      return;
    }
    if (password && password !== password2) {
      setError("Новый пароль и повтор не совпадают");
      return;
    }
    setProfileSaving(true);
    setError(null);
    try {
      const { data } = await authApi.updateMe({
        login: login.trim(),
        email: email.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        patronymic: patronymic.trim() || null,
        phone: phone.trim() || null,
        ...(password ? { password } : {}),
      });
      setUser(data);
      setPassword("");
      setPassword2("");
    } catch (e) {
      setError(getApiErrorDetail(e));
    } finally {
      setProfileSaving(false);
    }
  };

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
      <ScrollView contentContainerStyle={styles.clientScroll}>
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

        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Профиль</Text>
          <Text style={styles.label}>Логин</Text>
          <TextInput style={styles.input} value={login} onChangeText={setLogin} autoCapitalize="none" />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.label}>Имя</Text>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
          <Text style={styles.label}>Фамилия</Text>
          <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
          <Text style={styles.label}>Отчество</Text>
          <TextInput style={styles.input} value={patronymic} onChangeText={setPatronymic} />
          <Text style={styles.label}>Телефон</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.label}>Новый пароль (необязательно)</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Оставьте пустым, если не меняете"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Повтор пароля</Text>
          <TextInput style={styles.input} value={password2} onChangeText={setPassword2} secureTextEntry />
          <Pressable
            style={[styles.saveBtn, profileSaving && styles.saveBtnOff]}
            disabled={profileSaving}
            onPress={() => void saveClientProfile()}
          >
            <Text style={styles.saveBtnText}>{profileSaving ? "Сохранение..." : "Сохранить изменения"}</Text>
          </Pressable>
        </View>

        <Text style={styles.h2}>Мои бронирования</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Пока нет бронирований.</Text>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.card}>
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
                {item.status !== "pending" ? (
                  <Pressable style={styles.detailBtn} onPress={() => void openDetails(item.id)}>
                    <Text style={styles.detailBtnText}>Детали</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {detail ? `Бронирование №${detail.id}` : "Загрузка..."}
              </Text>
              {detailLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
              ) : detail ? (
                <>
                  <Text style={styles.modalLine}>{detail.event.title}</Text>
                  <Text style={styles.modalLine}>
                    Категория: {detail.event.category}
                  </Text>
                  <Text style={styles.modalLine}>
                    Сеанс: {formatWhen(detail.schedule.start_datetime)} - {formatWhen(detail.schedule.end_datetime)}
                  </Text>
                  <Text style={styles.modalLine}>
                    Встреча: {detail.event.meeting_point ?? "-"}
                  </Text>
                  <Text style={styles.modalLine}>
                    Длительность: {detail.event.duration_minutes != null ? `${detail.event.duration_minutes} мин` : "-"}
                  </Text>
                  <Text style={styles.modalLine}>Статус: {statusLabel[detail.status] ?? detail.status}</Text>
                  <Text style={styles.modalLine}>Итого: {detail.total_price} ₽</Text>
                  <Text style={styles.modalLine}>Участников: {detail.participants_count}</Text>

                  <Text style={styles.h5}>Участники</Text>
                  {detail.participants.map((p) => (
                    <Text key={p.id} style={styles.participant}>
                      {p.last_name} {p.first_name} {p.patronymic ?? ""} · возраст {p.age ?? "-"} · {p.is_child ? "реб." : "взр."}
                    </Text>
                  ))}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setDetailOpen(false)}>
              <Text style={styles.btnText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  detailBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  detailBtnText: { color: colors.primary, fontWeight: "700" },
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
  clientScroll: { paddingBottom: 32 },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileTitle: { fontSize: 17, fontWeight: "800", marginBottom: 10, color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  saveBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10, color: colors.text },
  modalLine: { marginBottom: 6, color: colors.text },
  h5: { fontWeight: "700", marginTop: 12, marginBottom: 8, color: colors.text },
  participant: { marginBottom: 4, color: colors.text },
  modalClose: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
