import { AppstoreOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  DatePicker,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { EventCard } from "../components/EventCard";
import { eventsApi } from "../services/eventsApi";
import type { EventCategory, EventRecord, EventStatus } from "../types";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PAGE_SIZE = 12;

const categories: { value: EventCategory | ""; label: string }[] = [
  { value: "", label: "Все категории" },
  { value: "excursion", label: "Экскурсии" },
  { value: "quest", label: "Квесты" },
  { value: "workshop", label: "Мастер-классы" },
];

export default function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const q = searchParams.get("q") ?? "";
  const category = (searchParams.get("category") ?? "") as EventCategory | "";
  const audience = searchParams.get("audience") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  const [draftQ, setDraftQ] = useState(q);
  const [draftAudience, setDraftAudience] = useState(audience);
  const [draftCategory, setDraftCategory] = useState<EventCategory | "">(
    category,
  );
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(() => {
    if (dateFrom && dateTo) return [dayjs(dateFrom), dayjs(dateTo)];
    return null;
  });

  const [items, setItems] = useState<EventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftQ(q);
    setDraftAudience(audience);
    setDraftCategory(category);
    if (dateFrom && dateTo) setRange([dayjs(dateFrom), dayjs(dateTo)]);
    else setRange(null);
  }, [q, audience, category, dateFrom, dateTo]);

  const skip = (page - 1) * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eventsApi.list({
        skip,
        limit: PAGE_SIZE,
        q: q || undefined,
        category: category || undefined,
        target_audience: audience || undefined,
        status: "active" as EventStatus,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [skip, q, category, audience, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    if (draftQ.trim()) next.set("q", draftQ.trim());
    if (draftCategory) next.set("category", draftCategory);
    if (draftAudience.trim()) next.set("audience", draftAudience.trim());
    if (range?.[0] && range[1]) {
      next.set("date_from", range[0].format("YYYY-MM-DD"));
      next.set("date_to", range[1].format("YYYY-MM-DD"));
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const onPageChange = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  return (
    <div
      style={{ padding: "24px 20px 56px", maxWidth: 1200, margin: "0 auto" }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            Каталог мероприятий
          </Title>
          <Text type="secondary">
            Выберите фильтры и откройте карточку, чтобы перейти к описанию и
            бронированию.
          </Text>
        </div>

        <div
          style={{
            padding: 20,
            background: "#fff",
            borderRadius: 12,
            border: "1px solid rgba(184, 50, 50, 0.12)",
            boxShadow: "0 8px 28px rgba(40, 10, 10, 0.06)",
          }}
        >
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} md={12} lg={8}>
              <Text type="secondary">Поиск по названию</Text>
              <Input
                allowClear
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Например: музей"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onPressEnter={applyFilters}
              />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Text type="secondary">Категория</Text>
              <Select
                size="large"
                style={{ width: "100%" }}
                options={categories}
                value={draftCategory || undefined}
                onChange={(v) => setDraftCategory(v ?? "")}
              />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Text type="secondary">Возрастная группа / аудитория</Text>
              <Input
                size="large"
                allowClear
                placeholder="Подстрока поиска, напр. школьник"
                value={draftAudience}
                onChange={(e) => setDraftAudience(e.target.value)}
              />
            </Col>
            <Col xs={24} md={12} lg={10}>
              <Text type="secondary">Даты сеансов (диапазон)</Text>
              <RangePicker
                size="large"
                style={{ width: "100%" }}
                value={range}
                onChange={(d) => setRange(d)}
                format="DD.MM.YYYY"
              />
            </Col>
            <Col xs={24} md={12} lg={6}>
              <Button
                type="primary"
                size="large"
                block
                icon={<AppstoreOutlined />}
                onClick={applyFilters}
              >
                Применить
              </Button>
            </Col>
          </Row>
        </div>

        {error && <Text type="danger">{error}</Text>}

        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : items.length === 0 ? (
          <Empty description="Ничего не найдено — измените фильтры" />
        ) : (
          <>
            <Row gutter={[20, 20]}>
              {items.map((ev) => (
                <Col xs={24} sm={12} lg={8} key={ev.id}>
                  <EventCard event={ev} />
                </Col>
              ))}
            </Row>
            {total > PAGE_SIZE && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <Pagination
                  current={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={onPageChange}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </Space>
    </div>
  );
}
