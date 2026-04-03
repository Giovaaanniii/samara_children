import { Alert, Spin, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { BookingForm } from "../components/BookingForm";
import { bookingsApi } from "../services/bookingsApi";
import { schedulesApi } from "../services/schedulesApi";
import { useAuthStore } from "../store/authStore";
import type { BookingCreate, ScheduleBookingInfo } from "../types";
import { getApiErrorDetail } from "../utils/apiError";
import type { BookingFormValues } from "../utils/validation";

const { Title, Text } = Typography;

export default function BookingPage() {
  const { scheduleId: sid } = useParams<{ scheduleId: string }>();
  const scheduleId = Number(sid);
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [schedule, setSchedule] = useState<ScheduleBookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/book/${scheduleId}`)}`,
        { replace: true },
      );
    }
  }, [authLoading, token, navigate, scheduleId]);

  useEffect(() => {
    if (!Number.isFinite(scheduleId) || scheduleId < 1) {
      setError("Некорректный идентификатор сеанса");
      setLoading(false);
      return;
    }
    if (authLoading || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await schedulesApi.getBookingContext(scheduleId);
        if (!cancelled) setSchedule(data);
      } catch (e) {
        if (!cancelled) setError(getApiErrorDetail(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleId, authLoading, token]);

  const onPay = async (values: BookingFormValues) => {
    if (!schedule) return;
    if (values.participants.length > schedule.available_slots) {
      message.error("Недостаточно свободных мест на выбранный состав");
      return;
    }

    const body: BookingCreate = {
      schedule_id: schedule.id,
      participants_count: values.participants.length,
      customer_notes: values.customer_notes?.trim() || null,
      participants: values.participants.map((p) => ({
        first_name: p.first_name.trim(),
        last_name: p.last_name.trim(),
        patronymic: p.patronymic?.trim() || null,
        age: p.age ?? null,
        is_child: p.is_child,
        special_notes: p.special_notes?.trim() || null,
      })),
    };

    setSubmitting(true);
    try {
      const { data } = await bookingsApi.create(body);
      if (data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }
      message.error("Сервер не вернул ссылку на оплату");
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (!token && loading)) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!Number.isFinite(scheduleId) || scheduleId < 1) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <Alert type="error" message="Некорректная ссылка на бронирование" showIcon />
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <Alert type="error" message={error ?? "Сеанс не найден"} showIcon />
      </div>
    );
  }

  if (schedule.status !== "open") {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <Alert
          type="warning"
          showIcon
          message="Этот сеанс недоступен для бронирования"
        />
      </div>
    );
  }

  if (schedule.available_slots < 1) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <Alert type="info" showIcon message="На этот сеанс нет свободных мест" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 20px 56px", maxWidth: 760, margin: "0 auto" }}>
      <Title level={3} style={{ marginBottom: 8 }}>
        Бронирование
      </Title>
      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Проверьте данные участников и перейдите к оплате через ЮKassa.
      </Text>
      <BookingForm schedule={schedule} onPay={onPay} submitting={submitting} />
    </div>
  );
}
