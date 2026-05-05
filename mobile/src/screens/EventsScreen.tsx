import {
  type RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventListItem } from "../components/EventListItem";
import { eventsApi } from "../api/events";
import { getApiErrorDetail } from "../lib/errors";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { EventCategory, EventRecord } from "../types/api";

const PAGE_SIZE = 12;

const categories: { value: EventCategory | ""; label: string }[] = [
  { value: "", label: "Все" },
  { value: "excursion", label: "Экскурсии" },
  { value: "quest", label: "Квесты" },
  { value: "workshop", label: "Мастер-классы" },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;
type EventsRoute = RouteProp<MainTabParamList, "EventsTab">;

export default function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<EventsRoute>();
  const initialQ = route.params?.q ?? "";

  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState<EventCategory | "">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQ(initialQ);
    setPage(1);
  }, [initialQ]);

  const skip = (page - 1) * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eventsApi.list({
        skip,
        limit: PAGE_SIZE,
        q: q.trim() || undefined,
        category: category || undefined,
        status: "active",
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(getApiErrorDetail(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [skip, q, category, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.filters}>
        <TextInput
          style={styles.input}
          placeholder="Название…"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setPage(1)}
          returnKeyType="search"
        />
        <View style={styles.catRow}>
          {categories.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => {
                setCategory(c.value);
                setPage(1);
              }}
              style={[
                styles.chip,
                category === c.value && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === c.value && styles.chipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.apply}
          onPress={() => {
            setPage(1);
          }}
        >
          <Text style={styles.applyText}>Применить</Text>
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.spin} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EventListItem
              item={item}
              onPress={() =>
                navigation.navigate("EventDetail", { eventId: item.id })
              }
            />
          )}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={styles.pager}>
              <Pressable
                style={[styles.pageBtn, page <= 1 && styles.pageBtnOff]}
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Text style={styles.pageBtnText}>Назад</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                {page} / {totalPages} · {total} шт.
              </Text>
              <Pressable
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnOff]}
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <Text style={styles.pageBtnText}>Вперёд</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Ничего не найдено.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filters: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
    color: colors.text,
  },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  apply: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyText: { color: "#fff", fontWeight: "700" },
  list: { padding: 16, paddingBottom: 32 },
  spin: { marginTop: 32 },
  error: { color: colors.error, padding: 16 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 24 },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 8,
  },
  pageBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pageBtnOff: { opacity: 0.4 },
  pageBtnText: { color: "#fff", fontWeight: "700" },
  pageInfo: { fontSize: 14, color: colors.muted },
});
