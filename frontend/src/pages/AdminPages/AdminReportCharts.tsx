import { Card, Typography } from "antd";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { PopularEventPoint } from "../../types";

import styles from "./AdminReportCharts.module.css";

const { Text } = Typography;

const PIE_COLORS = [
  "#b83232",
  "#c94a42",
  "#d96258",
  "#e47a6e",
  "#ec9284",
  "#c45c2a",
  "#8b3d6b",
  "#2d6a8f",
  "#3d7a4a",
  "#6b5a2d",
];

function truncateLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function parseRevenue(v: string): number {
  const n = Number.parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

type Props = {
  rows: PopularEventPoint[];
};

/** Три разных типа диаграмм по данным топа мероприятий. */
export default function AdminReportCharts({ rows }: Props) {
  const pieData = useMemo(
    () =>
      rows.map((r) => ({
        id: r.event_id,
        name: truncateLabel(r.event_title, 24),
        fullName: r.event_title,
        value: r.bookings_count,
      })),
    [rows],
  );

  const barData = useMemo(
    () =>
      rows.map((r) => ({
        name: truncateLabel(r.event_title, 14),
        fullTitle: r.event_title,
        bookings: r.bookings_count,
      })),
    [rows],
  );

  const lineData = useMemo(
    () =>
      rows.map((r, i) => ({
        rank: i + 1,
        title: r.event_title,
        revenue: parseRevenue(r.revenue),
      })),
    [rows],
  );

  if (!rows.length) {
    return (
      <Card>
        <Text type="secondary">Недостаточно данных для диаграмм (нет оплаченных / подтверждённых бронирований в выборке).</Text>
      </Card>
    );
  }

  return (
    <div className={styles.grid}>
      <Card
        className={styles.chartCard}
        title="Круговая диаграмма"
        variant="borderless"
      >
        <Text type="secondary" className={styles.chartHint}>
          Доли бронирований по мероприятиям (доля от суммы броней в топе).
        </Text>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={48}
                outerRadius={88}
                paddingAngle={2}
                labelLine={{ stroke: "#aaa" }}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((d, i) => (
                  <Cell key={d.id} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} брон.`, ""]}
                labelFormatter={(_, payload) => {
                  const p = Array.isArray(payload) ? payload[0] : payload;
                  return String((p?.payload as { fullName?: string })?.fullName ?? "");
                }}
                contentStyle={{ borderRadius: 8 }}
              />
              <Legend
                verticalAlign="bottom"
                height={56}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        className={styles.chartCard}
        title="Гистограмма"
        variant="borderless"
      >
        <Text type="secondary" className={styles.chartHint}>
          Число бронирований по каждому мероприятию (сравнение объёмов).
        </Text>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0e0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#5a3a3a" }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                formatter={(value) => [`${value} брон.`, "Бронирований"]}
                labelFormatter={(_, payload) => {
                  const p = Array.isArray(payload) ? payload[0] : payload;
                  return String((p?.payload as { fullTitle?: string })?.fullTitle ?? "");
                }}
                contentStyle={{ borderRadius: 8 }}
              />
              <Bar dataKey="bookings" fill="#b83232" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        className={styles.chartCard}
        title="Линейный график"
        variant="borderless"
      >
        <Text type="secondary" className={styles.chartHint}>
          Выручка по позициям в рейтинге (1 — самое популярное по числу броней).
        </Text>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e0e0" />
              <XAxis
                dataKey="rank"
                tickFormatter={(v) => `#${v}`}
                label={{ value: "Место в топе", position: "insideBottom", offset: -4, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) =>
                  `${Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 0 })}`
                }
                width={52}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === "number" ? value : Number(value);
                  const s = Number.isFinite(n)
                    ? n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                    : String(value);
                  return [`${s} ₽`, "Выручка"];
                }}
                labelFormatter={(_, payload) => {
                  const p = Array.isArray(payload) ? payload[0] : payload;
                  return String((p?.payload as { title?: string })?.title ?? "");
                }}
                contentStyle={{ borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#b83232"
                strokeWidth={2.5}
                dot={{ fill: "#b83232", strokeWidth: 2, r: 4, stroke: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
