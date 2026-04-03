import { CheckCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Alert, Card, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { bookingsApi } from "../services/bookingsApi";
import { useAuthStore } from "../store/authStore";
import type { BookingDetail } from "../types";
import { formatDateTime } from "../utils/formatDate";
import { getApiErrorDetail } from "../utils/apiError";

const { Title, Text } = Typography;

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const bookingIdRaw = params.get("booking_id");
  const bookingId = bookingIdRaw ? Number(bookingIdRaw) : NaN;
  const token = useAuthStore((s) => s.token);

  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(bookingId) || bookingId < 1) {
      setLoading(false);
      setError("Не указан номер бронирования");
      return;
    }
    if (!token) {
      setLoading(false);
      setError("Войдите в аккаунт, чтобы увидеть статус оплаты");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await bookingsApi.getById(bookingId);
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) setError(getApiErrorDetail(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, token]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" indicator={<LoadingOutlined spin />} />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Проверяем статус бронирования…</Text>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    const loginHref =
      Number.isFinite(bookingId) && bookingId >= 1
        ? `/login?redirect=${encodeURIComponent(`/payment/return?booking_id=${bookingId}`)}`
        : "/login";
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <Alert type="error" message={error} showIcon />
        {!token && (
          <div style={{ marginTop: 12 }}>
            <Link to={loginHref}>Войти</Link>
          </div>
        )}
        <Link to="/events" style={{ display: "inline-block", marginTop: 16 }}>
          В каталог
        </Link>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const ok = detail.status === "confirmed";
  const pending = detail.status === "pending";

  return (
    <div style={{ padding: "32px 20px 56px", maxWidth: 560, margin: "0 auto" }}>
      <Card>
        {ok ? (
          <>
            <Title level={3} style={{ marginTop: 0 }}>
              <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
              Оплата прошла успешно
            </Title>
            <Text type="secondary">
              Бронирование №{detail.id} подтверждено. Ждём вас на мероприятии.
            </Text>
          </>
        ) : pending ? (
          <>
            <Title level={3} style={{ marginTop: 0 }}>
              Оплата обрабатывается
            </Title>
            <Text type="secondary">
              Бронирование №{detail.id} создано. Статус: ожидает подтверждения
              оплаты — обновите страницу через минуту или проверьте почту.
            </Text>
          </>
        ) : (
          <>
            <Title level={3} style={{ marginTop: 0 }}>
              Статус бронирования
            </Title>
            <Text>
              №{detail.id} — {detail.status}
            </Text>
          </>
        )}

        <div style={{ marginTop: 20 }}>
          <Text strong>{detail.event.title}</Text>
          <br />
          <Text type="secondary">
            {formatDateTime(detail.schedule.start_datetime)} —{" "}
            {formatDateTime(detail.schedule.end_datetime)}
          </Text>
          <br />
          <Text>Сумма: {detail.total_price} ₽</Text>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/profile">Личный кабинет</Link>
          {" · "}
          <Link to="/events">Каталог</Link>
        </div>
      </Card>
    </div>
  );
}
