import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { guidesApi } from "../../api/guides";
import { formatDateTime } from "../../lib/formatDate";
import { colors } from "../../theme";
import type { GuideRatingResponse, GuideRatingReviewItem } from "../../types/api";

export default function GuideRatingPanel() {
  const [data, setData] = useState<GuideRatingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await guidesApi.myRating();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Рейтинг от клиентов</Text>
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Рейтинг от клиентов</Text>
        <Text style={styles.muted}>Не удалось загрузить рейтинг.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Рейтинг от клиентов</Text>
      <Text style={styles.sub}>
        Средняя оценка работы гида
        {data.reviews_count > 0 ? (
          <Text style={styles.score}>
            {" "}
            — <Text style={styles.scoreNum}>{data.average_guide_rating.toFixed(2)}</Text> / 5
            {"\n"}
            <Text style={styles.mutedSmall}>
              Опубликованных отзывов с оценкой гида: {data.reviews_count}
            </Text>
          </Text>
        ) : (
          <Text style={styles.muted}> — пока нет опубликованных отзывов</Text>
        )}
      </Text>

      {data.reviews.length > 0
        ? data.reviews.map((r) => <ReviewRow key={r.review_id} item={r} />)
        : null}
    </View>
  );
}

function ReviewRow({ item }: { item: GuideRatingReviewItem }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewTitle} numberOfLines={2}>
        {item.event_title}
      </Text>
      <Text style={styles.reviewMeta}>
        Бронь №{item.booking_id}
        {item.guide_rating != null ? ` · оценка гида ${item.guide_rating}/5` : ""}
      </Text>
      {item.comment ? (
        <Text style={styles.comment}>{item.comment}</Text>
      ) : null}
      <Text style={styles.reviewDate}>
        {formatDateTime(item.created_at)}
        {item.author_name ? ` · ${item.author_name}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 10 },
  sub: { fontSize: 15, color: colors.text, lineHeight: 22 },
  score: { fontWeight: "600" },
  scoreNum: { color: colors.primary, fontSize: 18 },
  muted: { color: colors.muted },
  mutedSmall: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  reviewRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  reviewTitle: { fontWeight: "700", color: colors.text },
  reviewMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  comment: { marginTop: 6, color: colors.text },
  reviewDate: { fontSize: 12, color: colors.muted, marginTop: 6 },
});
