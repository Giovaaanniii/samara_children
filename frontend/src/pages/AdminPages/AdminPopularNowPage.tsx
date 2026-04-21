import { Button, Card, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";

import { eventsApi } from "../../services/eventsApi";
import type { EventRecord } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { eventCategoryLabels } from "../../utils/adminLabels";

const { Title, Text } = Typography;

export default function AdminPopularNowPage() {
  const [allEvents, setAllEvents] = useState<EventRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: listRes }, { data: selected }] = await Promise.all([
        eventsApi.list({ limit: 100, status: "active" }),
        eventsApi.popularNow(),
      ]);
      setAllEvents(listRes.items);
      setSelectedIds(selected.map((e) => e.id).slice(0, 6));
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const options = useMemo(
    () =>
      allEvents.map((e) => ({
        value: e.id,
        label: `${e.title} (#${e.id})`,
      })),
    [allEvents],
  );

  const selectedRows = useMemo(() => {
    const map = new Map(allEvents.map((e) => [e.id, e]));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as EventRecord[];
  }, [allEvents, selectedIds]);

  const save = async () => {
    const count = selectedIds.length;
    if (count > 6) {
      message.error("Можно сохранить не более 6 мероприятий.");
      return;
    }
    setSaving(true);
    try {
      const ids = selectedIds;
      const { data } = await eventsApi.adminPopularNowSet(ids);
      setSelectedIds(data.map((e) => e.id).slice(0, 6));
      if (ids.length < 6) {
        message.warning(
          `Сохранено меньше 6 мероприятий (${ids.length}). Блок на главной заполнен не полностью.`,
        );
      } else {
        message.success("Подборка 'Популярные сейчас' сохранена");
      }
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading}>
      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Популярные сейчас
        </Title>
        <Button type="primary" onClick={() => void save()} loading={saving}>
          Сохранить подборку
        </Button>
      </Space>

      <Text type="secondary">
        Выберите до 6 существующих активных мероприятий, которые показываются в блоке "Популярные сейчас" на главной.
      </Text>
      <div style={{ marginTop: 8 }}>
        <Text type={selectedIds.length === 6 ? "success" : "warning"}>
          Выбрано: {selectedIds.length} из 6
        </Text>
      </div>

      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <Select<number[]>
          mode="multiple"
          value={selectedIds}
          onChange={(vals) => setSelectedIds(vals)}
          options={options}
          placeholder="Выберите мероприятия"
          style={{ width: "100%" }}
          maxTagCount={4}
        />
      </div>

      <Table<EventRecord>
        rowKey="id"
        dataSource={selectedRows}
        pagination={false}
        locale={{ emptyText: "Подборка пуста" }}
        scroll={{ x: true }}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "Название", dataIndex: "title" },
          { title: "Категория", render: (_, r) => eventCategoryLabels[r.category] ?? r.category },
          { title: "Цена", render: (_, r) => `${r.base_price} ₽`, width: 130 },
          { title: "Статус", render: (_, r) => <Tag>{r.status}</Tag>, width: 110 },
        ]}
      />
    </Card>
  );
}
