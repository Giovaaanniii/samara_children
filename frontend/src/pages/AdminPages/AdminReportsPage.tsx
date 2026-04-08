import { Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Typography } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "../../services/adminApi";
import type { AdminReports, PopularEventPoint } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";

import AdminReportCharts from "./AdminReportCharts";
import styles from "./AdminReportsPage.module.css";

const { Title, Text } = Typography;

function periodQuery(range: [Dayjs, Dayjs] | null) {
  if (!range) return undefined;
  return {
    date_from: range[0].startOf("day").toISOString(),
    date_to: range[1].endOf("day").toISOString(),
  };
}

/** Таблица с теми же данными — только цифры; названия с переносом, без сжатия в «М…». */
function PopularEventsNumbersTable({ rows }: { rows: PopularEventPoint[] }) {
  if (!rows.length) {
    return <Text type="secondary">Нет данных по оплаченным/подтверждённым бронированиям за выбранные условия.</Text>;
  }
  return (
    <div className={styles.numbersTableWrap}>
      <Table<PopularEventPoint>
        size="middle"
        rowKey="event_id"
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 640 }}
        dataSource={rows}
        columns={[
          {
            title: "Мероприятие",
            dataIndex: "event_title",
            key: "event_title",
            width: "42%",
            ellipsis: false,
            render: (title: string) => (
              <span className={styles.eventTitleCell}>{title}</span>
            ),
          },
          {
            title: "Бронирований",
            dataIndex: "bookings_count",
            width: 120,
            align: "right" as const,
          },
          {
            title: "Участников (всего)",
            dataIndex: "participants_count",
            width: 140,
            align: "right" as const,
          },
          {
            title: "Выручка",
            key: "revenue",
            width: 120,
            align: "right" as const,
            render: (_, r) => `${r.revenue} ₽`,
          },
        ]}
      />
    </div>
  );
}

export default function AdminReportsPage() {
  const [data, setData] = useState<AdminReports | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Диапазон в интерфейсе (может быть выбран до нажатия «Показать»). */
  const [rangeDraft, setRangeDraft] = useState<[Dayjs, Dayjs] | null>(null);
  /** Учтённый в последнем запросе период; null — без фильтра (всё время). */
  const [appliedRange, setAppliedRange] = useState<[Dayjs, Dayjs] | null>(null);

  const fetchSummary = useCallback(async (range: [Dayjs, Dayjs] | null) => {
    setLoading(true);
    setError(null);
    try {
      const pq = periodQuery(range);
      const { data: d } = await adminApi.reports.summary(pq);
      setData(d);
      setAppliedRange(range);
    } catch (e) {
      setError(getApiErrorDetail(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary(null);
  }, [fetchSummary]);

  const periodLabel = useMemo(() => {
    if (!data?.sales.period_from && !data?.sales.period_to) return null;
    const from = data.sales.period_from ? dayjs(data.sales.period_from) : null;
    const to = data.sales.period_to ? dayjs(data.sales.period_to) : null;
    if (from && to) {
      return `Период: ${from.format("DD.MM.YYYY")} — ${to.format("DD.MM.YYYY")} (по дате создания бронирования)`;
    }
    if (from) return `С ${from.format("DD.MM.YYYY")} (по дате создания бронирования)`;
    if (to) return `По ${to.format("DD.MM.YYYY")} (по дате создания бронирования)`;
    return null;
  }, [data]);

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap align="center" style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Отчёты</Title>
          <Space wrap>
            <DatePicker.RangePicker
              value={rangeDraft}
              onChange={(v) => setRangeDraft(v as [Dayjs, Dayjs] | null)}
              format="DD.MM.YYYY"
            />
            <Button
              type="primary"
              loading={loading}
              onClick={() => void fetchSummary(rangeDraft)}
            >
              Показать
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                setRangeDraft(null);
                void fetchSummary(null);
              }}
            >
              За всё время
            </Button>
          </Space>
        </Space>
        {periodLabel ? <Text type="secondary">{periodLabel}</Text> : !appliedRange ? (
          <Text type="secondary">Без ограничения по дате: все бронирования в базе.</Text>
        ) : null}
        {error ? <Text type="danger">{error}</Text> : null}
      </Space>
      {!data && loading ? (
        <Card style={{ marginTop: 16 }}>
          <Text type="secondary">Загрузка…</Text>
        </Card>
      ) : null}
      {data ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card>
              <Statistic
                title={appliedRange ? "Всего бронирований за период" : "Всего бронирований"}
                value={data.sales.bookings_total}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic
                title={appliedRange ? "Оплачено / подтверждено за период" : "Оплачено / подтверждено"}
                value={data.sales.paid_bookings}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card>
              <Statistic
                title={
                  appliedRange
                    ? "Выручка за период (подтв. и завершённые)"
                    : "Выручка (по подтверждённым и завершённым)"
                }
                value={data.sales.revenue_total}
                suffix="₽"
              />
            </Card>
          </Col>
          <Col span={24}>
            <Title level={5} style={{ margin: "0 0 8px" }}>
              Диаграммы
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              Три разных представления по топу мероприятий (оплаченные и подтверждённые бронирования).
            </Text>
            <AdminReportCharts rows={data.popular_events} />
          </Col>
          <Col span={24}>
            <Card title="Цифры по мероприятиям">
              <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
             
              </Text>
              <PopularEventsNumbersTable rows={data.popular_events} />
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
