import { Button, Card, DatePicker, Grid, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import type { Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../../services/adminApi";
import type { BookingResponse, BookingStatus } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { bookingStatusLabels, bookingStatusOptions } from "../../utils/adminLabels";
import { formatDateTime } from "../../utils/formatDate";

const { Title } = Typography;

const tableLocale = { emptyText: "Нет данных" };

function listParams(
  status: BookingStatus | undefined,
  period: [Dayjs, Dayjs] | null,
): Parameters<typeof adminApi.bookings.listAll>[0] {
  const p: { status?: BookingStatus; created_from?: string; created_to?: string } = {};
  if (status) p.status = status;
  if (period) {
    p.created_from = period[0].startOf("day").toISOString();
    p.created_to = period[1].endOf("day").toISOString();
  }
  return Object.keys(p).length ? p : undefined;
}

export default function AdminBookingsPage() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [items, setItems] = useState<BookingResponse[]>([]);
  const [status, setStatus] = useState<BookingStatus | undefined>();
  const [periodDraft, setPeriodDraft] = useState<[Dayjs, Dayjs] | null>(null);
  const [appliedPeriod, setAppliedPeriod] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BookingResponse | null>(null);
  const [editStatus, setEditStatus] = useState<BookingStatus>("pending");
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.bookings.listAll(listParams(status, appliedPeriod));
      setItems(data);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setLoading(false);
    }
  }, [status, appliedPeriod]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmBooking = async (id: number) => {
    try {
      await adminApi.bookings.confirm(id);
      message.success("Бронирование подтверждено");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };
  const cancelBooking = async (id: number) => {
    try {
      await adminApi.bookings.cancel(id);
      message.success("Бронирование отменено");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const openEditStatus = (row: BookingResponse) => {
    setEditing(row);
    setEditStatus(row.status);
    setEditOpen(true);
  };

  const saveStatus = async () => {
    if (!editing) return;
    setSavingStatus(true);
    try {
      await adminApi.bookings.updateStatus(editing.id, editStatus);
      message.success("Статус бронирования обновлён");
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size={12} style={{ width: "100%", marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>Все бронирования</Title>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <DatePicker.RangePicker
            value={periodDraft}
            onChange={(v) => setPeriodDraft(v as [Dayjs, Dayjs] | null)}
            format="DD.MM.YYYY"
            placeholder={["Создано с", "по"]}
            style={isMobile ? { width: "100%" } : { width: 300 }}
          />
          <Button
            type="primary"
            onClick={() => {
              setAppliedPeriod(periodDraft);
            }}
            disabled={!periodDraft}
          >
            Фильтр по периоду
          </Button>
          <Button
            onClick={() => {
              setPeriodDraft(null);
              setAppliedPeriod(null);
            }}
            disabled={!appliedPeriod && !periodDraft}
          >
            Сбросить период
          </Button>
          <Select
            allowClear
            style={isMobile ? { width: "100%" } : { width: 260 }}
            placeholder="Статус"
            value={status}
            onChange={(v) => setStatus(v)}
            options={bookingStatusOptions}
          />
        </div>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        locale={tableLocale}
        scroll={{ x: true }}
        columns={[
          { title: "№", dataIndex: "id", width: 70 },
          { title: "Пользователь", dataIndex: "user_id", width: 120 },
          { title: "Мероприятие", dataIndex: "event_title" },
          { title: "Создано", render: (_, r) => formatDateTime(r.created_at) },
          { title: "Сеанс", render: (_, r) => (r.schedule_start_datetime ? formatDateTime(r.schedule_start_datetime) : "—") },
          { title: "Группа", render: (_, r) => (r.participants_count > 1 ? <Tag color="blue">{r.participants_count} чел.</Tag> : "1 чел.") },
          { title: "Статус", render: (_, r) => <Tag>{bookingStatusLabels[r.status]}</Tag> },
          { title: "Сумма", render: (_, r) => `${r.total_price} ₽` },
          {
            title: "Действия",
            render: (_, r) => (
              <Space>
                <Button type="link" onClick={() => openEditStatus(r)}>Изменить статус</Button>
                {r.status === "pending" ? <Button type="link" onClick={() => void confirmBooking(r.id)}>Подтвердить</Button> : null}
                {r.status !== "cancelled" && r.status !== "completed" ? (
                  <Popconfirm
                    title="Отменить бронирование?"
                    okText="Да, отменить"
                    cancelText="Нет"
                    onConfirm={() => void cancelBooking(r.id)}
                  >
                    <Button type="link" danger>Отменить</Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? `Изменить статус брони №${editing.id}` : "Изменить статус"}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onOk={() => void saveStatus()}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={savingStatus}
        centered
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Текущий статус: {editing ? bookingStatusLabels[editing.status] : "—"}
          </Typography.Text>
          <Select
            value={editStatus}
            onChange={(v) => setEditStatus(v)}
            options={bookingStatusOptions.map((opt) => ({
              ...opt,
              disabled: opt.value === "pending",
            }))}
          />
          <Typography.Text type="secondary">
            Статус pending меняется автоматически и недоступен для ручной установки.
          </Typography.Text>
        </Space>
      </Modal>
    </Card>
  );
}
