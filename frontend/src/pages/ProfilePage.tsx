import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";

import { bookingsApi, type BookingStatusFilter } from "../services/bookingsApi";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import type { BookingDetail, BookingResponse, ScheduleBrief } from "../types";
import { getApiErrorDetail } from "../utils/apiError";
import { formatDateTime } from "../utils/formatDate";
import { profileSchema, type ProfileFormValues } from "../utils/validation";

import styles from "./ProfilePage.module.css";

const { Title, Text, Paragraph } = Typography;

const bookingStatusLabels: Record<BookingStatusFilter, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
};

const categoryLabels: Record<string, string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

/** Сеанс уже прошёл — пропуск по QR не показываем. */
function isScheduleEnded(schedule: ScheduleBrief): boolean {
  const t = new Date(schedule.end_datetime).getTime();
  return Number.isFinite(t) && t <= Date.now();
}

/** QR только для подтверждённой брони до конца мероприятия. */
function shouldShowBookingQr(detail: BookingDetail): boolean {
  if (detail.status !== "confirmed") return false;
  if (isScheduleEnded(detail.schedule)) return false;
  return Boolean(detail.qr_code_data_uri);
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter | "">("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      login: "",
      email: "",
      first_name: "",
      last_name: "",
      patronymic: "",
      phone: "",
      password: "",
      password2: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      login: user.login,
      email: user.email,
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      patronymic: user.patronymic ?? "",
      phone: user.phone ?? "",
      password: "",
      password2: "",
    });
  }, [user, reset]);

  const loadBookings = useCallback(async () => {
    if (!user) return;
    setBookingsLoading(true);
    try {
      const { data } = await bookingsApi.my(statusFilter || undefined);
      setBookings(data);
    } catch {
      setBookings([]);
      message.error("Не удалось загрузить бронирования");
    } finally {
      setBookingsLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const onSaveProfile = async (values: ProfileFormValues) => {
    try {
      const body = {
        login: values.login.trim(),
        email: values.email.trim(),
        first_name: values.first_name?.trim() || null,
        last_name: values.last_name?.trim() || null,
        patronymic: values.patronymic?.trim() || null,
        phone: values.phone?.trim() || null,
        ...(values.password ? { password: values.password } : {}),
      };
      const { data } = await authApi.updateMe(body);
      setUser(data);
      message.success("Профиль сохранен");
      reset({ ...values, password: "", password2: "" });
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const openDetails = async (bookingId: number) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data } = await bookingsApi.getById(bookingId);
      setDetail(data);
    } catch (e) {
      message.error(getApiErrorDetail(e));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  const onCancelBooking = (row: BookingResponse) => {
    Modal.confirm({
      title: "Отменить бронирование?",
      content:
        row.status === "confirmed"
          ? "Для оплаченного бронирования будет инициирован возврат средств (если включено в настройках)."
          : "Резерв мест будет снят.",
      okText: "Отменить бронь",
      okType: "danger",
      cancelText: "Назад",
      onOk: async () => {
        try {
          const { data } = await bookingsApi.cancel(row.id);
          message.success(data.message ?? "Бронирование отменено");
          await loadBookings();
          if (detail?.id === row.id) closeDetails();
        } catch (e) {
          message.error(getApiErrorDetail(e));
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login?redirect=/profile" replace />;

  const canCancel = (s: BookingResponse["status"]) => s === "pending" || s === "confirmed";

  return (
    <div className={styles.page}>
      <Title level={2} className={styles.sectionTitle}>Личный кабинет</Title>

      <Card title="Профиль" className={styles.profileCard}>
        <Form layout="vertical" style={{ maxWidth: 480 }}>
          <Form.Item label="Логин" validateStatus={errors.login ? "error" : undefined} help={errors.login?.message}>
            <Controller name="login" control={control} render={({ field }) => <Input {...field} autoComplete="username" />} />
          </Form.Item>
          <Form.Item label="Email" validateStatus={errors.email ? "error" : undefined} help={errors.email?.message}>
            <Controller name="email" control={control} render={({ field }) => <Input type="email" {...field} autoComplete="email" />} />
          </Form.Item>
          <Form.Item label="Имя"><Controller name="first_name" control={control} render={({ field }) => <Input {...field} />} /></Form.Item>
          <Form.Item label="Фамилия"><Controller name="last_name" control={control} render={({ field }) => <Input {...field} />} /></Form.Item>
          <Form.Item label="Отчество"><Controller name="patronymic" control={control} render={({ field }) => <Input {...field} />} /></Form.Item>
          <Form.Item label="Телефон"><Controller name="phone" control={control} render={({ field }) => <Input {...field} />} /></Form.Item>
          <Form.Item label="Новый пароль" validateStatus={errors.password ? "error" : undefined} help={errors.password?.message}>
            <Controller name="password" control={control} render={({ field }) => <Input.Password {...field} autoComplete="new-password" placeholder="Оставьте пустым, если не меняете" />} />
          </Form.Item>
          <Form.Item label="Повтор пароля" validateStatus={errors.password2 ? "error" : undefined} help={errors.password2?.message}>
            <Controller name="password2" control={control} render={({ field }) => <Input.Password {...field} autoComplete="new-password" />} />
          </Form.Item>
          <Button type="primary" loading={isSubmitting} onClick={handleSubmit(onSaveProfile)}>Сохранить изменения</Button>
        </Form>
      </Card>

      <Card title="Мои бронирования" className={styles.bookingsCard}>
        <div className={styles.filterRow}>
          <Text>Статус:</Text>
          <Select
            style={{ minWidth: 200 }}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as BookingStatusFilter | "")}
            options={[
              { value: "", label: "Все статусы" },
              ...(Object.entries(bookingStatusLabels) as [BookingStatusFilter, string][]).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>

        <Table<BookingResponse>
          rowKey="id"
          loading={bookingsLoading}
          dataSource={bookings}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Нет бронирований" }}
          columns={[
            { title: "№", dataIndex: "id", width: 70 },
            { title: "Мероприятие", render: (_, row) => row.event_title ?? <Text type="secondary">Бронь #{row.id}</Text> },
            { title: "Сеанс", render: (_, row) => row.schedule_start_datetime ? formatDateTime(row.schedule_start_datetime) : "-" },
            {
              title: "Статус",
              render: (_, row) => (
                <Tag color={row.status === "confirmed" ? "green" : row.status === "pending" ? "orange" : row.status === "cancelled" ? "default" : "blue"}>
                  {bookingStatusLabels[row.status] ?? row.status}
                </Tag>
              ),
            },
            { title: "Сумма", render: (_, row) => `${row.total_price} ₽` },
            {
              title: "Действия",
              render: (_, row) => (
                <Space wrap>
                  <Button type="link" onClick={() => openDetails(row.id)}>Детали</Button>
                  {canCancel(row.status) ? <Button type="link" danger onClick={() => onCancelBooking(row)}>Отменить</Button> : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={detail ? `Бронирование №${detail.id}` : "Загрузка..."}
        open={detailOpen}
        onCancel={closeDetails}
        width={720}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={closeDetails}>Закрыть</Button>
            {detail ? (
              <Link to={`/events/${detail.event.id}`}>
                <Button type="primary">Страница мероприятия</Button>
              </Link>
            ) : null}
          </Space>
        }
      >
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
        ) : detail ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Мероприятие</Text>
              <Title level={4} style={{ margin: "4px 0 8px" }}>{detail.event.title}</Title>
              <Tag>{categoryLabels[detail.event.category] ?? detail.event.category}</Tag>
              <Paragraph style={{ marginTop: 12 }}>{detail.event.description ?? "Описание не указано."}</Paragraph>
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Встреча">{detail.event.meeting_point ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="Длительность">{detail.event.duration_minutes != null ? `${detail.event.duration_minutes} мин` : "-"}</Descriptions.Item>
                <Descriptions.Item label="Цена (базовая)">{detail.event.base_price} ₽</Descriptions.Item>
                <Descriptions.Item label="Сеанс">{formatDateTime(detail.schedule.start_datetime)} - {formatDateTime(detail.schedule.end_datetime)}</Descriptions.Item>
                <Descriptions.Item label="Статус брони">{bookingStatusLabels[detail.status] ?? detail.status}</Descriptions.Item>
                <Descriptions.Item label="Участников">{detail.participants_count}</Descriptions.Item>
                <Descriptions.Item label="Итого">{detail.total_price} ₽</Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <Title level={5}>Участники</Title>
              <Table
                size="small"
                pagination={false}
                dataSource={detail.participants}
                rowKey="id"
                columns={[
                  { title: "Фамилия", dataIndex: "last_name" },
                  { title: "Имя", dataIndex: "first_name" },
                  { title: "Отчество", dataIndex: "patronymic", render: (v) => v ?? "-" },
                  { title: "Возраст", dataIndex: "age", render: (v) => (v != null ? v : "-") },
                  { title: "Детский", dataIndex: "is_child", render: (v: boolean) => (v ? "да" : "нет") },
                ]}
              />
            </div>

            {shouldShowBookingQr(detail) ? (
              <div className={styles.qrBlock}>
                <Text strong>Пропуск (QR)</Text>
                <div style={{ marginTop: 8 }}>
                  <Image
                    src={detail.qr_code_data_uri}
                    alt="QR-код бронирования"
                    width={180}
                    preview={{ mask: "Нажмите для увеличения" }}
                  />
                </div>
                <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  Нажмите на QR, чтобы открыть его крупно. Покажите код на входе или назовите номер бронирования: {detail.id}
                </Text>
              </div>
            ) : (
              <Text type="secondary">
                {detail.status === "confirmed" && isScheduleEnded(detail.schedule)
                  ? "QR-код недоступен: мероприятие уже завершилось."
                  : "QR-код недоступен для текущего статуса бронирования."}
              </Text>
            )}
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
