import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { adminApi } from "../../services/adminApi";
import { eventsApi } from "../../services/eventsApi";
import type { EventCategory, EventRecord, EventStatus } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import {
  eventCategoryLabels,
  eventCategoryOptions,
  eventStatusLabels,
  eventStatusOptions,
} from "../../utils/adminLabels";

const tableLocale = { emptyText: "Нет данных" };

const { Title } = Typography;

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [form] = Form.useForm<{
    title: string;
    category: EventCategory;
    status: EventStatus;
    base_price: number;
    description?: string;
    target_audience?: string;
    duration_minutes?: number;
    max_participants?: number;
    meeting_point?: string;
    cover_image_url?: string;
  }>();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await eventsApi.list({ limit: 100 });
      setItems(data.items);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onDelete = async (id: number) => {
    try {
      await adminApi.events.remove(id);
      message.success("Мероприятие удалено");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const openEdit = (row: EventRecord) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      category: row.category,
      status: row.status,
      base_price: Number(row.base_price),
      description: row.description ?? undefined,
      target_audience: row.target_audience ?? undefined,
      duration_minutes: row.duration_minutes ?? undefined,
      max_participants: row.max_participants ?? undefined,
      meeting_point: row.meeting_point ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const v = await form.validateFields();
      await adminApi.events.update(editing.id, {
        ...v,
        base_price: String(v.base_price),
      });
      message.success("Сохранено");
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  return (
    <Card>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>Мероприятия</Title>
        <Link to="/admin/events/create"><Button type="primary">Создать новое</Button></Link>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        locale={tableLocale}
        columns={[
          { title: "Код", dataIndex: "id", width: 70 },
          { title: "Название", dataIndex: "title" },
          { title: "Категория", render: (_, r) => eventCategoryLabels[r.category] },
          { title: "Цена", render: (_, r) => `${r.base_price} ₽` },
          { title: "Статус", render: (_, r) => <Tag>{eventStatusLabels[r.status]}</Tag> },
          {
            title: "Действия",
            render: (_, r) => (
              <Space>
                <Button type="link" onClick={() => openEdit(r)}>Редактировать</Button>
                <Popconfirm
                  title="Удалить мероприятие?"
                  okText="Удалить"
                  cancelText="Отмена"
                  onConfirm={() => void onDelete(r.id)}
                >
                  <Button danger type="link">Удалить</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={`Редактирование: ${editing?.title ?? ""}`}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onOk={() => void saveEdit()}
        okText="Сохранить"
        cancelText="Отмена"
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Название" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ width: "100%" }} align="start" wrap>
            <Form.Item label="Категория" name="category" rules={[{ required: true }]} style={{ minWidth: 200 }}>
              <Select options={eventCategoryOptions} />
            </Form.Item>
            <Form.Item label="Статус" name="status" rules={[{ required: true }]} style={{ minWidth: 180 }}>
              <Select options={eventStatusOptions} />
            </Form.Item>
            <Form.Item label="Базовая цена" name="base_price" rules={[{ required: true }]} style={{ minWidth: 140 }}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item label="Описание" name="description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Целевая аудитория" name="target_audience"><Input /></Form.Item>
          <Space wrap>
            <Form.Item label="Длит. (мин)" name="duration_minutes"><InputNumber min={1} /></Form.Item>
            <Form.Item label="Макс. участников" name="max_participants"><InputNumber min={1} /></Form.Item>
          </Space>
          <Form.Item label="Точка встречи" name="meeting_point"><Input /></Form.Item>
          <Form.Item label="URL обложки" name="cover_image_url"><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
