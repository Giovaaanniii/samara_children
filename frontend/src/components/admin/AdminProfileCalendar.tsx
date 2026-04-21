import { CloseOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Calendar,
  Card,
  List,
  Modal,
  Popconfirm,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";

import { reportsApi } from "../../services/reportsApi";
import type { AdminGuideRefusalItem } from "../../types";
import { formatDateTime } from "../../utils/formatDate";

import styles from "./AdminProfileCalendar.module.css";

const { Text, Paragraph } = Typography;

/** Дни с подтверждёнными бронями (сеанс не завершён / не отменён). */
export default function AdminProfileCalendar() {
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const [loading, setLoading] = useState(false);
  const [countByDay, setCountByDay] = useState<Record<string, number>>({});
  const [bookingIdsByDay, setBookingIdsByDay] = useState<Record<string, number[]>>(
    {},
  );
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(null);
  const [refusals, setRefusals] = useState<AdminGuideRefusalItem[]>([]);
  const [refusalsLoading, setRefusalsLoading] = useState(false);
  const [removingScheduleId, setRemovingScheduleId] = useState<number | null>(null);

  const loadCalendar = useCallback(async (m: Dayjs) => {
    setLoading(true);
    try {
      const y = m.year();
      const mo = m.month() + 1;
      const { data } = await reportsApi.adminCalendar(y, mo);
      const map: Record<string, number> = {};
      const idsMap: Record<string, number[]> = {};
      for (const d of data.days) {
        const key = d.date.slice(0, 10);
        const ids = d.booking_ids ?? [];
        map[key] = d.confirmed_booking_count ?? ids.length;
        idsMap[key] = ids;
      }
      setCountByDay(map);
      setBookingIdsByDay(idsMap);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRefusals = useCallback(async () => {
    setRefusalsLoading(true);
    try {
      const { data } = await reportsApi.adminGuideRefusals(30);
      setRefusals(data);
    } catch {
      setRefusals([]);
    } finally {
      setRefusalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar(month);
  }, [month, loadCalendar]);

  useEffect(() => {
    void loadRefusals();
  }, [loadRefusals]);

  const onPanelChange = (d: Dayjs) => {
    setMonth(d.startOf("month"));
  };

  const onSelectDate = (d: Dayjs) => {
    const key = d.format("YYYY-MM-DD");
    const ids = bookingIdsByDay[key] ?? [];
    if (ids.length === 0) return;
    setSelectedDay(d);
    setDayModalOpen(true);
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setSelectedDay(null);
  };

  const removeRefusal = async (scheduleId: number) => {
    setRemovingScheduleId(scheduleId);
    try {
      await reportsApi.deleteGuideRefusal(scheduleId);
      message.success("Запись отказа удалена");
      await loadRefusals();
    } catch {
      message.error("Не удалось удалить запись отказа");
    } finally {
      setRemovingScheduleId(null);
    }
  };

  const cellRender = useCallback(
    (current: Dayjs, info: { type: string }) => {
      if (info.type !== "date") return null;
      const key = current.format("YYYY-MM-DD");
      const n = countByDay[key];
      const inCurrentMonth = current.month() === month.month();
      return (
        <div className={`${styles.cell} ${n ? styles.cellHasBooking : ""}`}>
          <span className={`${styles.dayNumber} ${inCurrentMonth ? "" : styles.dayMuted}`}>
            {current.date()}
          </span>
          {n ? (
            <Badge
              count={n}
              size="small"
              title={`Подтверждённых броней: ${n}`}
              className={styles.cellBadge}
            />
          ) : null}
        </div>
      );
    },
    [countByDay, month],
  );

  const selectedBookingIds =
    selectedDay != null
      ? bookingIdsByDay[selectedDay.format("YYYY-MM-DD")] ?? []
      : [];

  return (
    <>
      <Card
        title="Календарь бронирований"
        className={styles.card}
        extra={
          <Text type="secondary">
            Подсветка: дни с подтверждёнными бронями (сеанс ещё не завершён)
          </Text>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Уведомления об отказе гида приходят на email администраторов и push (если настроено). Ниже —
          журнал отказов и календарь по фактическим оплаченным броням.
        </Paragraph>
        <Spin spinning={loading}>
          <Calendar
            value={month}
            onPanelChange={onPanelChange}
            onSelect={onSelectDate}
            fullscreen
            cellRender={cellRender}
          />
        </Spin>
        <Text type="secondary" className={styles.hint}>
          Нажмите на день с подсветкой — откроется список номеров броней (подтверждено).
        </Text>
      </Card>

      <Modal
        title={
          selectedDay
            ? `Брони на ${selectedDay.format("D MMMM YYYY")}`
            : "Брони"
        }
        open={dayModalOpen}
        onCancel={closeDayModal}
        footer={null}
        destroyOnHidden
      >
        <p className={styles.modalLead}>Номера бронирований:</p>
        <div className={styles.bookingTags}>
          {selectedBookingIds.map((id) => (
            <Tag key={id} color="red">
              № {id}
            </Tag>
          ))}
        </div>
      </Modal>

      <Card title="Отказы гидов от сеансов" className={styles.card}>
        <Spin spinning={refusalsLoading}>
          <List
            dataSource={refusals}
            locale={{ emptyText: "Отказов пока нет" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key={`delete-refusal-${item.schedule_id}`}
                    title="Удалить запись отказа?"
                    description="Точно хотите удалить эту запись?"
                    okText="Удалить"
                    cancelText="Отмена"
                    onConfirm={() => void removeRefusal(item.schedule_id)}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<CloseOutlined />}
                      loading={removingScheduleId === item.schedule_id}
                      aria-label="Удалить запись отказа"
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <>
                      {item.event_title}{" "}
                      <Text type="secondary">· сеанс #{item.schedule_id}</Text>
                    </>
                  }
                  description={
                    <>
                      <div>
                        <Text type="secondary">Начало: </Text>
                        {formatDateTime(item.start_datetime)}
                      </div>
                      <div>
                        <Text type="secondary">Отказ: </Text>
                        {formatDateTime(item.rejected_at)}
                      </div>
                      <div>
                        <Text type="secondary">Гид: </Text>
                        {item.guide_name}
                      </div>
                      <div>
                        <Text type="secondary">Причина: </Text>
                        {item.reject_reason}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      </Card>
    </>
  );
}
