import { Col, Row, Spin, Typography } from "antd";
import { useEffect, useState } from "react";

import { EventCard } from "../components/EventCard";
import { eventsApi } from "../services/eventsApi";
import type { EventRecord } from "../types";

const { Title } = Typography;

export default function EventsPage() {
  const [items, setItems] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await eventsApi.list({ limit: 50 });
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Не удалось загрузить список");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Typography.Paragraph type="danger" style={{ padding: 24 }}>
        {error}
      </Typography.Paragraph>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Title level={2}>Мероприятия</Title>
      <Row gutter={[16, 16]}>
        {items.map((ev) => (
          <Col xs={24} md={12} lg={8} key={ev.id}>
            <EventCard event={ev} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
