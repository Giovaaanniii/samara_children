import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { EventRecord } from "../types/api";

const categoryLabel: Record<string, string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

type Props = {
  item: EventRecord;
  onPress: () => void;
};

export function EventListItem({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.placeholderText}>Нет фото</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.badge}>
          {categoryLabel[item.category] ?? item.category}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.target_audience ? (
          <Text style={styles.meta}>{item.target_audience}</Text>
        ) : null}
        <Text style={styles.price}>{item.base_price} ₽</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.92 },
  cover: { width: "100%", height: 140, backgroundColor: "#eee" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: colors.muted },
  body: { padding: 12 },
  badge: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 8,
  },
});
