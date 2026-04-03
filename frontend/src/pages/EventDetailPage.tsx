import { Button, Descriptions, List, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { eventsApi } from "../services/eventsApi";
import type { EventDetail } from "../types";
import { formatDateTime } from "../utils/formatDate";

const { Title, Paragraph } = Typography;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setError("Некорректный id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await eventsApi.getById(eventId);
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Paragraph type="danger" style={{ padding: 24 }}>
        {error ?? "Не найдено"}
      </Paragraph>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <Title level={2}>{data.title}</Title>
      <Paragraph>{data.description}</Paragraph>
      <Descriptions column={1} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Цена">{data.base_price} ₽</Descriptions.Item>
        <Descriptions.Item label="Категория">{data.category}</Descriptions.Item>
        {data.meeting_point && (
          <Descriptions.Item label="Место встречи">
            {data.meeting_point}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Title level={4}>Сеансы</Title>
      <List
        dataSource={data.schedules}
        locale={{ emptyText: "Нет доступных сеансов" }}
        renderItem={(s) => (
          <List.Item
            actions={[
              <Link
                key="book"
                to={`/events/${data.id}/booking?scheduleId=${s.id}`}
              >
                <Button type="primary">Забронировать</Button>
              </Link>,
            ]}
          >
            <List.Item.Meta
              title={formatDateTime(s.start_datetime)}
              description={`Свободно мест: ${s.available_slots} · ${s.status}`}
            />
          </List.Item>
        )}
      />
    </div>
  );
}
