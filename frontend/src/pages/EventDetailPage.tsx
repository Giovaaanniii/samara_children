import {
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  List,
  Rate,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { eventsApi } from "../services/eventsApi";
import type { EventDetail } from "../types";
import { formatDateTime } from "../utils/formatDate";

import styles from "./EventDetailPage.module.css";

const { Title, Paragraph, Text } = Typography;

const categoryLabels: Record<string, string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

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

  const avgRating = useMemo(() => {
    if (!data?.reviews?.length) return null;
    const sum = data.reviews.reduce((a, r) => a + r.rating, 0);
    return sum / data.reviews.length;
  }, [data]);

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
    <div className={styles.wrap}>
      <div className={styles.hero}>
        {data.cover_image_url ? (
          <img
            className={styles.heroImg}
            src={data.cover_image_url}
            alt=""
          />
        ) : (
          <div className={styles.heroFallback}>Фото мероприятия</div>
        )}
      </div>

      <div className={styles.meta}>
        <Tag color="red">{categoryLabels[data.category] ?? data.category}</Tag>
        <Title level={2} style={{ marginTop: 12 }}>
          {data.title}
        </Title>
        {data.target_audience && (
          <Paragraph type="secondary">{data.target_audience}</Paragraph>
        )}
      </div>

      <Paragraph style={{ fontSize: 16, lineHeight: 1.7 }}>
        {data.description || "Описание появится позже."}
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={8}>
          <Card size="small" bordered={false} style={{ background: "#fffbfb" }}>
            <Text type="secondary">
              <DollarOutlined /> Цена
            </Text>
            <Title level={4} style={{ margin: "8px 0 0" }}>
              от {data.base_price} ₽
            </Title>
          </Card>
        </Col>
        {data.duration_minutes != null && (
          <Col xs={24} md={8}>
            <Card size="small" bordered={false} style={{ background: "#fffbfb" }}>
              <Text type="secondary">
                <CalendarOutlined /> Длительность
              </Text>
              <Title level={4} style={{ margin: "8px 0 0" }}>
                {data.duration_minutes} мин
              </Title>
            </Card>
          </Col>
        )}
        {data.meeting_point && (
          <Col xs={24} md={8}>
            <Card size="small" bordered={false} style={{ background: "#fffbfb" }}>
              <Text type="secondary">
                <EnvironmentOutlined /> Встреча
              </Text>
              <Paragraph style={{ margin: "8px 0 0" }}>
                {data.meeting_point}
              </Paragraph>
            </Card>
          </Col>
        )}
      </Row>

      <Descriptions
        column={1}
        bordered
        size="small"
        style={{ marginTop: 24 }}
        labelStyle={{ width: 200, background: "#fff9f9" }}
      >
        <Descriptions.Item label="Статус">{data.status}</Descriptions.Item>
        {data.max_participants != null && (
          <Descriptions.Item label="Макс. участников">
            {data.max_participants}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Title level={3} style={{ marginTop: 32 }}>
        Расписание сеансов
      </Title>
      {data.schedules.length === 0 ? (
        <Empty description="Нет запланированных сеансов" />
      ) : (
        <List
          dataSource={data.schedules}
          renderItem={(s) => (
            <List.Item
              style={{
                padding: "16px 0",
                borderBottom: "1px solid rgba(0,0,0,.06)",
              }}
              actions={[
                <Link key="book" to={`/book/${s.id}`}>
                  <Button type="primary" size="large">
                    Забронировать
                  </Button>
                </Link>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Text strong>{formatDateTime(s.start_datetime)}</Text>
                }
                description={
                  <>
                    до {formatDateTime(s.end_datetime)} · свободно мест:{" "}
                    <Text type={s.available_slots > 0 ? "success" : "danger"}>
                      {s.available_slots}
                    </Text>{" "}
                    · {s.status}
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Title level={3} style={{ marginTop: 32 }}>
        Отзывы
        {avgRating != null && (
          <span style={{ marginLeft: 12, fontWeight: 400 }}>
            <Rate disabled allowHalf value={avgRating} />{" "}
            <Text type="secondary">({data.reviews.length})</Text>
          </span>
        )}
      </Title>
      {data.reviews.length === 0 ? (
        <Empty description="Пока нет опубликованных отзывов" />
      ) : (
        data.reviews.map((r) => (
          <Card key={r.id} className={styles.reviewCard} size="small">
            <Rate disabled value={r.rating} />
            {r.guide_rating != null && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">Гид: </Text>
                <Rate disabled allowHalf value={r.guide_rating} />
              </div>
            )}
            {r.comment && (
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {r.comment}
              </Paragraph>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDateTime(r.created_at)}
            </Text>
          </Card>
        ))
      )}
    </div>
  );
}
