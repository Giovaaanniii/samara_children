import {
  Button,
  Card,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import { adminApi } from "../../services/adminApi";
import { eventsApi } from "../../services/eventsApi";
import type { EventRecord, Guide, Schedule, ScheduleStatus } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { scheduleStatusLabels, scheduleStatusOptions } from "../../utils/adminLabels";

const { Title } = Typography;

const tableLocale = { emptyText: "Нет данных" };

type CreateValues = {
  event_id: number;
  start_end: [dayjs.Dayjs, dayjs.Dayjs];
  available_slots: number;
  status: ScheduleStatus;
  guide_id?: number;
};

type EditValues = {
  start_end: [dayjs.Dayjs, dayjs.Dayjs];
  available_slots: number;
  status: ScheduleStatus;
  guide_id?: number;
};

export default function AdminSchedulesPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [eventId, setEventId] = useState<number | undefined>();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [editForm] = Form.useForm<EditValues>();

  const load = async (eventFilter?: number) => {
    try {
      const [{ data: e }, { data: g }, { data: s }] = await Promise.all([
        eventsApi.list({ limit: 100 }),
        adminApi.guides.list(),
        adminApi.schedules.list(eventFilter),
      ]);
      setEvents(e.items);
      setGuides(g);
      setSchedules(s);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (v: CreateValues) => {
    try {
      await adminApi.schedules.create({
        event_id: v.event_id,
        start_datetime: v.start_end[0].toISOString(),
        end_datetime: v.start_end[1].toISOString(),
        available_slots: v.available_slots,
        status: v.status,
        guide_id: v.guide_id ?? null,
      });
      message.success("Сеанс добавлен");
      await load(eventId);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const openEdit = (row: Schedule) => {
    setEditing(row);
    editForm.setFieldsValue({
      start_end: [dayjs(row.start_datetime), dayjs(row.end_datetime)],
      available_slots: row.available_slots,
      status: row.status,
      guide_id: row.guide_id ?? undefined,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const v = await editForm.validateFields();
      await adminApi.schedules.update(editing.id, {
        start_datetime: v.start_end[0].toISOString(),
        end_datetime: v.start_end[1].toISOString(),
        available_slots: v.available_slots,
        status: v.status,
        guide_id: v.guide_id ?? null,
      });
      message.success("Сеанс обновлён");
      setEditOpen(false);
      setEditing(null);
      await load(eventId);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await adminApi.schedules.remove(id);
      message.success("Сеанс удалён");
      await load(eventId);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  return (
    <Card>
      <Title level={4}>Управление расписанием</Title>
      <Space style={{ marginBottom: 14 }} wrap>
        <Select
          allowClear
          style={{ minWidth: 320 }}
          placeholder="Фильтр по мероприятию"
          value={eventId}
          onChange={(v) => {
            setEventId(v);
            void load(v);
          }}
          options={events.map((e) => ({ value: e.id, label: `${e.id} — ${e.title}` }))}
        />
      </Space>
      <Form layout="inline" onFinish={(v) => void create(v as CreateValues)} style={{ marginBottom: 16, flexWrap: "wrap", display: "flex", gap: 8 }}>
        <Form.Item name="event_id" rules={[{ required: true }]}>
          <Select style={{ width: 280 }} placeholder="Мероприятие" options={events.map((e) => ({ value: e.id, label: e.title }))} />
        </Form.Item>
        <Form.Item name="start_end" rules={[{ required: true }]}>
          <DatePicker.RangePicker showTime />
        </Form.Item>
        <Form.Item name="available_slots" rules={[{ required: true }]} initialValue={10}>
          <InputNumber min={0} placeholder="Мест" />
        </Form.Item>
        <Form.Item name="status" initialValue="open" rules={[{ required: true }]}>
          <Select style={{ width: 220 }} options={scheduleStatusOptions} />
        </Form.Item>
        <Form.Item name="guide_id">
          <Select allowClear style={{ width: 240 }} placeholder="Гид" options={guides.map((g) => ({ value: g.id, label: `${g.last_name} ${g.first_name}` }))} />
        </Form.Item>
        <Button type="primary" htmlType="submit">Добавить</Button>
      </Form>
      <Table
        rowKey="id"
        dataSource={schedules}
        locale={tableLocale}
        columns={[
          { title: "Код", dataIndex: "id", width: 70 },
          {
            title: "Мероприятие",
            render: (_, r) => events.find((e) => e.id === r.event_id)?.title ?? String(r.event_id),
          },
          { title: "Начало", render: (_, r) => dayjs(r.start_datetime).format("DD.MM.YYYY HH:mm") },
          { title: "Конец", render: (_, r) => dayjs(r.end_datetime).format("DD.MM.YYYY HH:mm") },
          { title: "Мест", dataIndex: "available_slots" },
          { title: "Статус", render: (_, r) => scheduleStatusLabels[r.status] },
          {
            title: "Действия",
            render: (_, r) => (
              <Space>
                <Button type="link" onClick={() => openEdit(r)}>Изменить</Button>
                <Popconfirm
                  title="Удалить сеанс? (только если нет бронирований)"
                  okText="Удалить"
                  cancelText="Отмена"
                  onConfirm={() => void remove(r.id)}
                >
                  <Button type="link" danger>Удалить</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`Сеанс #${editing?.id ?? ""}`}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onOk={() => void saveEdit()}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="start_end" label="Интервал" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="available_slots" label="Свободных мест" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Статус" rules={[{ required: true }]}>
            <Select options={scheduleStatusOptions} />
          </Form.Item>
          <Form.Item name="guide_id" label="Гид">
            <Select allowClear options={guides.map((g) => ({ value: g.id, label: `${g.last_name} ${g.first_name}` }))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
