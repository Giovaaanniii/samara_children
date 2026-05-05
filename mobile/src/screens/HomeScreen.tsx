import {
  type CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
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
import type { EventRecord } from "../types/api";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "HomeTab">,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [popular, setPopular] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eventsApi.popularNow();
      setPopular(data);
    } catch (e) {
      setError(getApiErrorDetail(e));
      setPopular([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = () => {
    const q = search.trim();
    navigation.navigate("EventsTab", q ? { q } : undefined);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Экскурсии и мероприятия для детей в Самаре
        </Text>
        <Text style={styles.heroSub}>
          Авторские программы для школьников и семей: экскурсии, квесты и
          мастер-классы.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Поиск по названию…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Найти</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Популярные сейчас</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.spin} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={popular}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <EventListItem
              item={item}
              onPress={() =>
                navigation.navigate("EventDetail", { eventId: item.id })
              }
            />
          )}
          scrollEnabled={popular.length > 2}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Нет данных для блока «Популярные».</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 28,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  searchRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
    color: colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  spin: { marginTop: 24 },
  error: { color: colors.error, paddingHorizontal: 16 },
  empty: { color: colors.muted, paddingHorizontal: 16 },
});
