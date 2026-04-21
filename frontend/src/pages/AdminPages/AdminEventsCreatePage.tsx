import { Button, Card, Form, Input, InputNumber, Select, Space, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";

import { adminApi } from "../../services/adminApi";
import type { EventCategory, EventStatus } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { eventCategoryOptions, eventStatusOptions } from "../../utils/adminLabels";

const { Title } = Typography;
const NO_TAG_VALUE = "__no_tag__";

type FormValues = {
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
};

const targetAudienceOptions = ["0+", "7+", "12+", "14+", "16+"].map((v) => ({
  label: v,
  value: v,
}));

export default function AdminEventsCreatePage() {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();

  const submit = async (values: FormValues) => {
    try {
      await adminApi.events.create({
        ...values,
        target_audience:
          values.target_audience && values.target_audience !== NO_TAG_VALUE
            ? values.target_audience.trim()
            : null,
        base_price: String(values.base_price),
      });
      message.success("Мероприятие создано");
      navigate("/admin/events");
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  return (
    <Card>
      <Title level={4}>Создание мероприятия</Title>
      <Form form={form} layout="vertical" onFinish={(v) => void submit(v)}>
        <Form.Item label="Название" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Space style={{ width: "100%" }} align="start" wrap>
          <Form.Item label="Категория" name="category" initialValue="excursion" rules={[{ required: true }]} style={{ minWidth: 240 }}>
            <Select options={eventCategoryOptions} />
          </Form.Item>
          <Form.Item label="Статус" name="status" initialValue="active" rules={[{ required: true }]} style={{ minWidth: 220 }}>
            <Select options={eventStatusOptions} />
          </Form.Item>
          <Form.Item label="Базовая цена" name="base_price" initialValue={0} rules={[{ required: true }]} style={{ minWidth: 160 }}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Form.Item label="Описание" name="description"><Input.TextArea rows={4} /></Form.Item>
        <Form.Item label="Целевая аудитория (теги)" name="target_audience">
          <Select
            options={[
              { label: "Без тега", value: NO_TAG_VALUE },
              ...targetAudienceOptions,
            ]}
            allowClear
            placeholder="Выберите возрастной тег"
          />
        </Form.Item>
        <Space style={{ width: "100%" }} align="start" wrap>
          <Form.Item label="Длительность (мин)" name="duration_minutes"><InputNumber min={1} style={{ width: 180 }} /></Form.Item>
          <Form.Item label="Макс. участников" name="max_participants"><InputNumber min={1} style={{ width: 180 }} /></Form.Item>
        </Space>
        <Form.Item label="Точка встречи" name="meeting_point"><Input /></Form.Item>
        <Form.Item label="URL обложки" name="cover_image_url"><Input /></Form.Item>
        <Button type="primary" htmlType="submit">Сохранить</Button>
      </Form>
    </Card>
  );
}
