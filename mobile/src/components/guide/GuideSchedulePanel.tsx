import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { guidesApi, type GuideSchedulePeriod } from "../../api/guides";
import { formatDateTime } from "../../lib/formatDate";
import { getApiErrorDetail } from "../../lib/errors";
import type { RootStackParamList } from "../../navigation/types";
import { colors } from "../../theme";
import type {
  GuideGroupResponse,
  GuideMyScheduleItem,
  GuideScheduleBookingBrief,
} from "../../types/api";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const scheduleStatusLabels: Record<string, string> = {
  open: "Набор открыт",
  closed: "Набор закрыт",
  cancelled: "Отменён",
  completed: "Завершён",
};

const bookingStatusLabels: Record<string, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Оплачено",
  cancelled: "Отменено",
  completed: "Завершено",
};

function guideDecisionLabel(row: GuideMyScheduleItem): string {
  if (row.guide_completed_at) return "Экскурсия проведена";
  if (row.guide_rejected_at) return "Вы отказались";
  if (row.guide_confirmed_at) return "Вы подтвердили выход";
  return "Решение не принято";
}

function canDecide(row: GuideMyScheduleItem): boolean {
  return (
    row.schedule_status !== "cancelled" &&
    row.schedule_status !== "completed" &&
    !row.guide_completed_at &&
    !row.guide_confirmed_at &&
    !row.guide_rejected_at
  );
}

function canComplete(row: GuideMyScheduleItem): boolean {
  return (
    Boolean(row.guide_confirmed_at) &&
    !row.guide_completed_at &&
    row.schedule_status !== "cancelled"
  );
}

const periodOptions: { value: GuideSchedulePeriod | ""; label: string }[] = [
  { value: "", label: "Все даты" },
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

export default function GuideSchedulePanel() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<GuideMyScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<GuideSchedulePeriod | "">("");
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const [groupOpen, setGroupOpen] = useState(false);
  const [group, setGroup] = useState<GuideGroupResponse | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectScheduleId, setRejectScheduleId] = useState<number | null>(null);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifySchedule, setVerifySchedule] = useState<GuideMyScheduleItem | null>(
    null,
  );
  const [verifyBookingInput, setVerifyBookingInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await guidesApi.mySchedule({
        ...(period ? { period } : {}),
        ...(scheduleStatus ? { status: scheduleStatus } : {}),
      });
      setItems(data);
    } catch {
      setItems([]);
      Alert.alert("Ошибка", "Не удалось загрузить расписание");
    } finally {
      setLoading(false);
    }
  }, [period, scheduleStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleExpand = (scheduleId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) next.delete(scheduleId);
      else next.add(scheduleId);
      return next;
    });
  };

  const openGroup = async (bookingId: number) => {
    setGroupOpen(true);
    setGroup(null);
    setGroupLoading(true);
    try {
      const { data } = await guidesApi.groupByBooking(bookingId);
      setGroup(data);
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
      setGroupOpen(false);
    } finally {
      setGroupLoading(false);
    }
  };

  const closeGroup = () => {
    setGroupOpen(false);
    setGroup(null);
  };

  const onConfirm = async (scheduleId: number) => {
    setActionLoading(true);
    try {
      await guidesApi.confirmSchedule(scheduleId);
      Alert.alert("Готово", "Выход на экскурсию подтверждён");
      await load();
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (rejectScheduleId == null) return;
    const r = rejectReason.trim();
    if (r.length < 3) {
      Alert.alert("Причина", "Не короче 3 символов");
      return;
    }
    setActionLoading(true);
    try {
      await guidesApi.rejectSchedule(rejectScheduleId, r);
      Alert.alert("Готово", "Отказ отправлен администраторам");
      setRejectOpen(false);
      await load();
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onCompleted = (scheduleId: number) => {
    Alert.alert(
      "Проведена?",
      "После этого сеанс будет закрыт для начисления.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Да, проведена",
          style: "default",
          onPress: async () => {
            setActionLoading(true);
            try {
              await guidesApi.markCompleted(scheduleId);
              Alert.alert("Готово", "Сеанс отмечен как проведённый");
              await load();
            } catch (e) {
              Alert.alert("Ошибка", getApiErrorDetail(e));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const submitVerifyByBooking = async () => {
    if (!verifySchedule) return;
    const bookingId = Number(verifyBookingInput.trim());
    if (!Number.isFinite(bookingId) || bookingId < 1) {
      Alert.alert("Номер", "Введите корректный номер бронирования.");
      return;
    }
    const booking = verifySchedule.bookings.find((b) => b.booking_id === bookingId);
    if (!booking) {
      Alert.alert("Ошибка", "Такого номера брони нет в текущем сеансе.");
      return;
    }
    if (booking.status !== "confirmed") {
      Alert.alert("Ошибка", "Бронь не подтверждена/не оплачена.");
      return;
    }
    setVerifyLoading(true);
    try {
      await guidesApi.markCompleted(verifySchedule.schedule_id);
      Alert.alert("Готово", `Сеанс завершён по бронированию №${bookingId}`);
      setVerifyOpen(false);
      setVerifySchedule(null);
      setVerifyBookingInput("");
      await load();
    } catch (e) {
      Alert.alert("Ошибка", getApiErrorDetail(e));
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.blockTitle}>Моё расписание</Text>
      <Text style={styles.intro}>
        Назначенные сеансы и группы (бронирования). Состав группы — после вашего
        подтверждения и не ранее чем за час до начала (или после завершения).
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {periodOptions.map((o) => (
          <Pressable
            key={o.label}
            style={[styles.chip, period === o.value && styles.chipOn]}
            onPress={() => setPeriod(o.value)}
          >
            <Text style={[styles.chipTxt, period === o.value && styles.chipTxtOn]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Статус сеанса</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        <Pressable
          style={[styles.chip, scheduleStatus === "" && styles.chipOn]}
          onPress={() => setScheduleStatus("")}
        >
          <Text style={[styles.chipTxt, scheduleStatus === "" && styles.chipTxtOn]}>
            Любой
          </Text>
        </Pressable>
        {Object.entries(scheduleStatusLabels).map(([value, label]) => (
          <Pressable
            key={value}
            style={[styles.chip, scheduleStatus === value && styles.chipOn]}
            onPress={() => setScheduleStatus(value)}
          >
            <Text
              style={[styles.chipTxt, scheduleStatus === value && styles.chipTxtOn]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading || actionLoading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Нет назначенных сеансов</Text>
      ) : (
        items.map((row) => (
          <View key={row.schedule_id} style={styles.sessionCard}>
            <Text style={styles.sessionTime}>
              {formatDateTime(row.start_datetime)} — {formatDateTime(row.end_datetime)}
            </Text>
            <Text style={styles.eventTitle}>{row.event_title}</Text>
            <Pressable
              onPress={() =>
                navigation.navigate("EventDetail", { eventId: row.event_id })
              }
            >
              <Text style={styles.link}>Страница мероприятия</Text>
            </Pressable>
            <Text style={styles.meta}>
              Участников: {row.participants_count} ·{" "}
              {scheduleStatusLabels[row.schedule_status] ?? row.schedule_status}
            </Text>
            <Text style={styles.decision}>{guideDecisionLabel(row)}</Text>
            {row.guide_reject_reason ? (
              <Text style={styles.reason}>{row.guide_reject_reason}</Text>
            ) : null}

            <View style={styles.actions}>
              {canDecide(row) ? (
                <>
                  <Pressable
                    style={styles.btnPrimary}
                    onPress={() => void onConfirm(row.schedule_id)}
                  >
                    <Text style={styles.btnPrimaryTxt}>Подтвердить</Text>
                  </Pressable>
                  <Pressable
                    style={styles.btnDanger}
                    onPress={() => {
                      setRejectScheduleId(row.schedule_id);
                      setRejectReason("");
                      setRejectOpen(true);
                    }}
                  >
                    <Text style={styles.btnDangerTxt}>Отказаться</Text>
                  </Pressable>
                </>
              ) : null}
              {canComplete(row) ? (
                <>
                  <Pressable
                    style={styles.btnOutline}
                    onPress={() => {
                      setVerifySchedule(row);
                      setVerifyBookingInput("");
                      setVerifyOpen(true);
                    }}
                  >
                    <Text style={styles.btnOutlineTxt}>По № брони</Text>
                  </Pressable>
                  <Pressable
                    style={styles.btnOutline}
                    onPress={() => onCompleted(row.schedule_id)}
                  >
                    <Text style={styles.btnOutlineTxt}>Проведена</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <Pressable onPress={() => toggleExpand(row.schedule_id)}>
              <Text style={styles.expandTxt}>
                {expanded.has(row.schedule_id) ? "▼ Скрыть брони" : "▶ Бронирования"}
              </Text>
            </Pressable>

            {expanded.has(row.schedule_id) ? (
              <View style={styles.nested}>
                {row.bookings.length === 0 ? (
                  <Text style={styles.muted}>
                    Пока нет бронирований по этому сеансу (кроме отменённых).
                  </Text>
                ) : (
                  row.bookings.map((b) => (
                    <BookingRow
                      key={b.booking_id}
                      b={b}
                      onOpenGroup={() => void openGroup(b.booking_id)}
                    />
                  ))
                )}
              </View>
            ) : null}
          </View>
        ))
      )}

      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={closeGroup}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {group ? `Группа по брони №${group.booking_id}` : "Загрузка…"}
              </Text>
              {groupLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : group ? (
                <>
                  <Text style={styles.modalLine}>{group.event_title}</Text>
                  <Text style={styles.modalLine}>
                    {formatDateTime(group.start_datetime)} —{" "}
                    {formatDateTime(group.end_datetime)}
                  </Text>
                  <Text style={styles.modalLine}>Заказчик: {group.customer_name}</Text>
                  <Text style={styles.modalLine}>
                    Email: {group.customer_email ?? "—"}
                  </Text>
                  <Text style={styles.modalLine}>
                    Тел.: {group.customer_phone ?? "—"}
                  </Text>
                  <Text style={styles.h5}>Участники</Text>
                  {group.participants.map((p) => (
                    <Text key={p.participant_id} style={styles.participant}>
                      {p.last_name} {p.first_name} {p.patronymic ?? ""} · возр.{" "}
                      {p.age ?? "—"} · {p.is_child ? "реб." : "взр."}
                    </Text>
                  ))}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={closeGroup}>
              <Text style={styles.btnPrimaryTxt}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Отказ от проведения</Text>
            <Text style={styles.muted}>Причина (не короче 3 символов)</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Текст для администратора"
            />
            <View style={styles.modalRow}>
              <Pressable style={styles.btnOutline} onPress={() => setRejectOpen(false)}>
                <Text style={styles.btnOutlineTxt}>Отмена</Text>
              </Pressable>
              <Pressable
                style={styles.btnPrimary}
                onPress={() => void submitReject()}
                disabled={actionLoading}
              >
                <Text style={styles.btnPrimaryTxt}>Отправить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={verifyOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Подтверждение по номеру брони</Text>
            <Text style={styles.muted}>
              Попросите клиента назвать номер бронирования. При корректном номере и
              оплаченной брони сеанс будет завершён.
            </Text>
            <TextInput
              style={styles.input}
              value={verifyBookingInput}
              onChangeText={setVerifyBookingInput}
              placeholder="Например: 48"
              keyboardType="number-pad"
            />
            <View style={styles.modalRow}>
              <Pressable
                style={styles.btnOutline}
                onPress={() => {
                  setVerifyOpen(false);
                  setVerifySchedule(null);
                  setVerifyBookingInput("");
                }}
              >
                <Text style={styles.btnOutlineTxt}>Отмена</Text>
              </Pressable>
              <Pressable
                style={styles.btnPrimary}
                onPress={() => void submitVerifyByBooking()}
                disabled={verifyLoading}
              >
                <Text style={styles.btnPrimaryTxt}>
                  {verifyLoading ? "…" : "Подтвердить"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BookingRow({
  b,
  onOpenGroup,
}: {
  b: GuideScheduleBookingBrief;
  onOpenGroup: () => void;
}) {
  return (
    <View style={styles.bookingRow}>
      <Text style={styles.bookingLine}>
        №{b.booking_id} · {b.participants_count} чел. ·{" "}
        {bookingStatusLabels[b.status] ?? b.status}
      </Text>
      <Pressable onPress={onOpenGroup}>
        <Text style={styles.link}>Состав группы</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  blockTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginHorizontal: 16,
    marginBottom: 8,
    color: colors.text,
  },
  intro: {
    marginHorizontal: 16,
    marginBottom: 12,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  chips: { marginBottom: 8, paddingHorizontal: 12, maxHeight: 44 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { fontSize: 13, color: colors.text },
  chipTxtOn: { color: "#fff", fontWeight: "600" },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 16,
    marginBottom: 4,
    color: colors.text,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionTime: { fontWeight: "700", color: colors.text },
  eventTitle: { fontSize: 16, fontWeight: "700", marginTop: 6, color: colors.text },
  link: { color: colors.primary, fontWeight: "600", marginTop: 4 },
  meta: { marginTop: 6, color: colors.muted, fontSize: 13 },
  decision: { marginTop: 6, fontWeight: "600", color: colors.text },
  reason: { marginTop: 4, fontSize: 13, color: colors.muted },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700" },
  btnDanger: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnDangerTxt: { color: colors.error, fontWeight: "700" },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnOutlineTxt: { color: colors.primary, fontWeight: "700" },
  expandTxt: { marginTop: 10, color: colors.primary, fontWeight: "600" },
  nested: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingRow: { marginBottom: 10 },
  bookingLine: { color: colors.text },
  empty: { textAlign: "center", color: colors.muted, padding: 24 },
  muted: { color: colors.muted, marginBottom: 8 },
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
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, color: colors.text },
  modalLine: { marginBottom: 6, color: colors.text },
  h5: { fontWeight: "700", marginTop: 12, marginBottom: 6, color: colors.text },
  participant: { fontSize: 14, color: colors.text, marginBottom: 4 },
  modalClose: {
    marginTop: 16,
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    minHeight: 100,
    padding: 10,
    textAlignVertical: "top",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    color: colors.text,
  },
});
