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
  Form,
  Input,
  List,
  Popconfirm,
  Rate,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { eventsApi } from "../services/eventsApi";
import { reviewsApi } from "../services/reviewsApi";
import { useAuthStore } from "../store/authStore";
import type { EligibleBookingReviewItem, EventDetail } from "../types";
import { formatDateTime } from "../utils/formatDate";
import { getApiErrorDetail } from "../utils/apiError";

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
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eligible, setEligible] = useState<EligibleBookingReviewItem[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [form] = Form.useForm<{
    booking_id: number;
    guide_rating: number;
    engagement_rating: number;
    organization_rating: number;
    comment?: string;
  }>();

  const wGuide = Form.useWatch("guide_rating", form);
  const wEng = Form.useWatch("engagement_rating", form);
  const wOrg = Form.useWatch("organization_rating", form);

  const previewOverall = useMemo(() => {
    const g = typeof wGuide === "number" ? wGuide : 5;
    const e = typeof wEng === "number" ? wEng : 5;
    const o = typeof wOrg === "number" ? wOrg : 5;
    return (g + e + o) / 3;
  }, [wGuide, wEng, wOrg]);

  const loadEvent = useCallback(async () => {
    if (!Number.isFinite(eventId)) return;
    const res = await eventsApi.getById(eventId);
    setData(res.data);
  }, [eventId]);

  useEffect(() => {
    if (!Number.isFinite(eventId)) {
      setError("Некорректный id");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadEvent();
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
  }, [eventId, loadEvent]);

  useEffect(() => {
    if (!token || !Number.isFinite(eventId)) {
      setEligible([]);
      return;
    }
    let cancelled = false;
    setEligibleLoading(true);
    (async () => {
      try {
        const res = await reviewsApi.eligibleBookings(eventId);
        if (!cancelled) setEligible(res.data);
      } catch {
        if (!cancelled) setEligible([]);
      } finally {
        if (!cancelled) setEligibleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, eventId]);

  const avgRating = useMemo(() => {
    if (!data?.reviews?.length) return null;
    const sum = data.reviews.reduce((a, r) => a + (r.average_rating ?? r.rating), 0);
    return sum / data.reviews.length;
  }, [data]);

  const onSubmitReview = async (values: {
    booking_id: number;
    guide_rating: number;
    engagement_rating: number;
    organization_rating: number;
    comment?: string;
  }) => {
    if (!data) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.create({
        event_id: data.id,
        booking_id: values.booking_id,
        guide_rating: values.guide_rating,
        engagement_rating: values.engagement_rating,
        organization_rating: values.organization_rating,
        comment: values.comment?.trim() || null,
      });
      message.success("Отзыв опубликован");
      form.resetFields();
      await loadEvent();
      if (token) {
        const el = await reviewsApi.eligibleBookings(data.id);
        setEligible(el.data);
      }
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setSubmittingReview(false);
    }
  };

  const onDeleteReview = async (reviewId: number) => {
    try {
      await reviewsApi.remove(reviewId);
      message.success("Отзыв удалён");
      await loadEvent();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

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
        {data.reviews.length > 0 && avgRating != null && (
          <span style={{ marginLeft: 12, fontWeight: 400 }}>
            <Text type="secondary">({data.reviews.length})</Text>
            <Text style={{ marginLeft: 8 }}>
              {" "}
              ·{" "}
              {avgRating.toLocaleString("ru-RU", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{" "}
              из 5
            </Text>
            <Rate
              disabled
              allowHalf
              value={avgRating}
              style={{ marginLeft: 12 }}
            />
          </span>
        )}
      </Title>

      {token && (
        <Card size="small" style={{ marginBottom: 20, background: "#fafafa" }}>
          {!eligibleLoading && eligible.length === 0 ? (
            <Text type="secondary">
              Оставить отзыв можно после подтверждённой оплаты и окончания сеанса по
              расписанию. На одно бронирование — один отзыв.
            </Text>
          ) : eligibleLoading ? (
            <Spin />
          ) : (
            <Form<{
              booking_id: number;
              guide_rating: number;
              engagement_rating: number;
              organization_rating: number;
              comment?: string;
            }>
              form={form}
              layout="vertical"
              onFinish={(v) => void onSubmitReview(v)}
              initialValues={{
                guide_rating: 5,
                engagement_rating: 5,
                organization_rating: 5,
              }}
            >
              <Form.Item
                name="booking_id"
                label="Бронирование"
                rules={[{ required: true, message: "Выберите посещение" }]}
              >
                <Select
                  placeholder="Выберите бронь"
                  options={eligible.map((e) => ({
                    value: e.booking_id,
                    label: `Бронь №${e.booking_id}, сеанс до ${formatDateTime(e.schedule_end)}`,
                  }))}
                />
              </Form.Item>
              <div className={styles.reviewFormPreview}>
                <span className={styles.reviewFormPreviewTitle}>Итоговая оценка (по трём критериям)</span>
                <Rate
                  disabled
                  allowHalf
                  value={previewOverall}
                  className={styles.reviewFormPreviewStars}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {previewOverall.toFixed(1)} из 5
                </Text>
              </div>
              <Form.Item
                name="guide_rating"
                label="Работа гида"
                rules={[{ required: true, message: "Оцените работу гида" }]}
              >
                <Rate />
              </Form.Item>
              <Form.Item
                name="engagement_rating"
                label="Вовлечённость"
                rules={[{ required: true, message: "Оцените вовлечённость" }]}
              >
                <Rate />
              </Form.Item>
              <Form.Item
                name="organization_rating"
                label="Организация"
                rules={[{ required: true, message: "Оцените организацию" }]}
              >
                <Rate />
              </Form.Item>
              <Form.Item name="comment" label="Комментарий">
                <Input.TextArea rows={3} placeholder="Необязательно" maxLength={2000} showCount />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={submittingReview}>
                Отправить отзыв
              </Button>
            </Form>
          )}
        </Card>
      )}

      {!token && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          <Link to={`/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`}>
            Войдите
          </Link>
          , чтобы оставить отзыв после посещения.
        </Paragraph>
      )}

      {data.reviews.length === 0 ? (
        <Empty description="Пока нет опубликованных отзывов" />
      ) : (
        data.reviews.map((r) => (
          <Card key={r.id} className={styles.reviewCard} size="small">
            <div className={styles.reviewHeader}>
              <Text strong>{r.author_name ?? "Участник"}</Text>
              <Text type="secondary" className={styles.reviewDate}>
                {formatDateTime(r.created_at)}
              </Text>
            </div>
            <div className={styles.reviewOverallBlock}>
              <span className={styles.reviewOverallLabel}>Общая оценка</span>
              <div className={styles.reviewOverallStars}>
                <Rate
                  disabled
                  allowHalf
                  value={r.average_rating ?? r.rating}
                  className={styles.reviewOverallRate}
                />
                <Text type="secondary" className={styles.reviewOverallValue}>
                  {(r.average_rating ?? r.rating).toFixed(1)} из 5
                </Text>
              </div>
            </div>
            <div className={styles.reviewCriteria}>
              {r.guide_rating != null && (
                <div className={styles.reviewCriterionRow}>
                  <span className={styles.criterionLabel}>Работа гида</span>
                  <Rate disabled value={r.guide_rating} />
                </div>
              )}
              {r.engagement_rating != null && (
                <div className={styles.reviewCriterionRow}>
                  <span className={styles.criterionLabel}>Вовлечённость</span>
                  <Rate disabled value={r.engagement_rating} />
                </div>
              )}
              {r.organization_rating != null && (
                <div className={styles.reviewCriterionRow}>
                  <span className={styles.criterionLabel}>Организация</span>
                  <Rate disabled value={r.organization_rating} />
                </div>
              )}
            </div>
            {r.comment && (
              <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                {r.comment}
              </Paragraph>
            )}
            {user?.role === "admin" && (
              <Popconfirm
                title="Удалить этот отзыв?"
                okText="Удалить"
                cancelText="Отмена"
                onConfirm={() => void onDeleteReview(r.id)}
              >
                <Button danger type="link" size="small" style={{ paddingLeft: 0, marginTop: 8 }}>
                  Удалить (админ)
                </Button>
              </Popconfirm>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
