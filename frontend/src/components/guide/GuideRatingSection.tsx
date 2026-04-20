import { Card, Rate, Spin, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

import { guidesApi } from "../../services/guidesApi";
import type { GuideRatingResponse } from "../../types";
import { formatDateTime } from "../../utils/formatDate";

import styles from "./GuideRatingSection.module.css";

const { Text, Title } = Typography;

export default function GuideRatingSection() {
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

  return (
    <Card title="Рейтинг от клиентов" className={styles.card}>
      <Spin spinning={loading}>
        {data ? (
          <>
            <div className={styles.summary}>
              <Title level={4} style={{ margin: 0 }}>
                Средняя оценка работы гида:{" "}
                {data.reviews_count > 0 ? (
                  <>
                    <Text strong>{data.average_guide_rating.toFixed(2)}</Text>{" "}
                    <Rate disabled allowHalf value={data.average_guide_rating} />
                  </>
                ) : (
                  <Text type="secondary">пока нет опубликованных отзывов</Text>
                )}
              </Title>
              <Text type="secondary">
                Учтены опубликованные отзывы с оценкой гида ({data.reviews_count} шт.)
              </Text>
            </div>
            {data.reviews.length > 0 ? (
              <Table
                size="small"
                rowKey="review_id"
                pagination={{ pageSize: 6 }}
                dataSource={data.reviews}
                columns={[
                  { title: "Бронь №", dataIndex: "booking_id", width: 90 },
                  { title: "Мероприятие", dataIndex: "event_title", ellipsis: true },
                  {
                    title: "Оценка гида",
                    width: 120,
                    render: (_, r) =>
                      r.guide_rating != null ? (
                        <Tag color="green">{r.guide_rating} / 5</Tag>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    title: "Комментарий",
                    dataIndex: "comment",
                    ellipsis: true,
                    render: (v: string | null) => v ?? "—",
                  },
                  {
                    title: "Дата",
                    width: 160,
                    render: (_, r) => formatDateTime(r.created_at),
                  },
                  {
                    title: "Автор",
                    dataIndex: "author_name",
                    width: 140,
                    ellipsis: true,
                    render: (v: string | null) => v ?? "—",
                  },
                ]}
              />
            ) : null}
          </>
        ) : (
          !loading && <Text type="secondary">Не удалось загрузить рейтинг.</Text>
        )}
      </Spin>
    </Card>
  );
}
