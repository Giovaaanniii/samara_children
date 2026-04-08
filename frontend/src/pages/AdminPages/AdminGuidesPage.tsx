import { Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Typography, message } from "antd";
import { useEffect, useState } from "react";

import { adminApi } from "../../services/adminApi";
import type { Guide } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";

const { Title } = Typography;

const tableLocale = { emptyText: "Нет данных" };

type GuideFormValues = {
  last_name: string;
  first_name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
};

export default function AdminGuidesPage() {
  const [list, setList] = useState<Guide[]>([]);
  const [form] = Form.useForm<GuideFormValues>();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [editForm] = Form.useForm<GuideFormValues>();

  const load = async () => {
    try {
      const { data } = await adminApi.guides.list();
      setList(data);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async (v: GuideFormValues) => {
    try {
      await adminApi.guides.create({
        first_name: v.first_name,
        last_name: v.last_name,
        specialization: v.specialization || null,
        email: v.email || null,
        phone: v.phone || null,
        is_active: v.is_active,
      });
      message.success("Гид добавлен");
      form.resetFields();
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const openEdit = (g: Guide) => {
    setEditing(g);
    editForm.setFieldsValue({
      last_name: g.last_name,
      first_name: g.first_name,
      specialization: g.specialization ?? undefined,
      phone: g.phone ?? undefined,
      email: g.email ?? undefined,
      is_active: g.is_active,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const v = await editForm.validateFields();
      await adminApi.guides.update(editing.id, {
        first_name: v.first_name,
        last_name: v.last_name,
        specialization: v.specialization || null,
        email: v.email || null,
        phone: v.phone || null,
        is_active: v.is_active,
      });
      message.success("Сохранено");
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const remove = async (id: number) => {
    try {
      await adminApi.guides.remove(id);
      message.success("Гид удалён");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  return (
    <Card>
      <Title level={4}>Гиды</Title>
      <Form form={form} layout="inline" onFinish={(v) => void add(v as GuideFormValues)} style={{ marginBottom: 16, flexWrap: "wrap", display: "flex", gap: 8 }}>
        <Form.Item name="last_name" rules={[{ required: true }]}><Input placeholder="Фамилия" /></Form.Item>
        <Form.Item name="first_name" rules={[{ required: true }]}><Input placeholder="Имя" /></Form.Item>
        <Form.Item name="specialization"><Input placeholder="Специализация" /></Form.Item>
        <Form.Item name="phone"><Input placeholder="Телефон" /></Form.Item>
        <Form.Item name="email"><Input placeholder="Эл. почта" /></Form.Item>
        <Form.Item name="is_active" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="активен" unCheckedChildren="неактивен" />
        </Form.Item>
        <Button type="primary" htmlType="submit">Добавить</Button>
      </Form>
      <Table
        rowKey="id"
        dataSource={list}
        locale={tableLocale}
        columns={[
          { title: "Код", dataIndex: "id", width: 70 },
          { title: "ФИО", render: (_, r) => `${r.last_name} ${r.first_name}` },
          { title: "Специализация", dataIndex: "specialization" },
          { title: "Телефон", dataIndex: "phone" },
          { title: "Эл. почта", dataIndex: "email" },
          { title: "Активен", render: (_, r) => (r.is_active ? "да" : "нет") },
          {
            title: "Действия",
            render: (_, r) => (
              <Space>
                <Button type="link" onClick={() => openEdit(r)}>Изменить</Button>
                <Popconfirm
                  title="Удалить гида?"
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
        title={`Гид: ${editing?.last_name ?? ""} ${editing?.first_name ?? ""}`}
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
          <Form.Item label="Фамилия" name="last_name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Имя" name="first_name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Специализация" name="specialization"><Input /></Form.Item>
          <Form.Item label="Телефон" name="phone"><Input /></Form.Item>
          <Form.Item label="Эл. почта" name="email"><Input /></Form.Item>
          <Form.Item label="Активен" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
