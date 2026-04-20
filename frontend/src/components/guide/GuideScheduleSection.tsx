import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { guidesApi, type GuideSchedulePeriod } from "../../services/guidesApi";
import type { GuideGroupResponse, GuideMyScheduleItem } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { formatDateTime } from "../../utils/formatDate";

import styles from "./GuideScheduleSection.module.css";

const { Text, Title } = Typography;

const scheduleStatusLabels: Record<string, string> = {
  open: "Набор открыт",
  closed: "Набор закрыт",
  cancelled: "Отменён",
  completed: "Завершён",
};

const bookingStatusLabels: Record<string, string> = {
  pending: "Ожидает оплаты",
  confirmed: "Оплачено",
  cancelled: "Отменено",
  completed: "Завершено",
};

function guideDecisionLabel(row: GuideMyScheduleItem): string {
  if (row.guide_completed_at) return "Экскурсия проведена";
  if (row.guide_rejected_at) return "Вы отказались";
  if (row.guide_confirmed_at) return "Вы подтвердили выход";
  return "Решение не принято";
}

export default function GuideScheduleSection() {
  const [items, setItems] = useState<GuideMyScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<GuideSchedulePeriod | "">("");
  const [scheduleStatus, setScheduleStatus] = useState<string>("");

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [group, setGroup] = useState<GuideGroupResponse | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectScheduleId, setRejectScheduleId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await guidesApi.mySchedule({
        ...(period ? { period } : {}),
        ...(scheduleStatus ? { status: scheduleStatus } : {}),
      });
      setItems(data);
    } catch {
      setItems([]);
      message.error("Не удалось загрузить расписание");
    } finally {
      setLoading(false);
    }
  }, [period, scheduleStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const openGroup = async (bookingId: number) => {
    setGroupOpen(true);
    setGroup(null);
    setGroupLoading(true);
    try {
      const { data } = await guidesApi.groupByBooking(bookingId);
      setGroup(data);
    } catch (e) {
      message.error(getApiErrorDetail(e));
      setGroupOpen(false);
    } finally {
      setGroupLoading(false);
    }
  };

  const closeGroup = () => {
    setGroupOpen(false);
    setGroup(null);
  };

  const openReject = (scheduleId: number) => {
    setRejectScheduleId(scheduleId);
    setRejectReason("");
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (rejectScheduleId == null) return;
    const r = rejectReason.trim();
    if (r.length < 3) {
      message.warning("Укажите причину не короче 3 символов");
      return;
    }
    setActionLoading(true);
    try {
      await guidesApi.rejectSchedule(rejectScheduleId, r);
      message.success("Отказ отправлен администраторам");
      setRejectOpen(false);
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onConfirm = async (scheduleId: number) => {
    setActionLoading(true);
    try {
      await guidesApi.confirmSchedule(scheduleId);
      message.success("Выход на экскурсию подтверждён");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setActionLoading(false);
    }
  };

  const onCompleted = async (scheduleId: number) => {
    Modal.confirm({
      title: "Отметить экскурсию проведённой?",
      content: "После этого сеанс будет закрыт для начисления.",
      okText: "Да, проведена",
      cancelText: "Отмена",
      onOk: async () => {
        setActionLoading(true);
        try {
          await guidesApi.markCompleted(scheduleId);
          message.success("Сеанс отмечен как проведённый");
          await load();
        } catch (e) {
          message.error(getApiErrorDetail(e));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const canDecide = (row: GuideMyScheduleItem) =>
    row.schedule_status !== "cancelled" &&
    row.schedule_status !== "completed" &&
    !row.guide_completed_at &&
    !row.guide_confirmed_at &&
    !row.guide_rejected_at;

  const canComplete = (row: GuideMyScheduleItem) =>
    Boolean(row.guide_confirmed_at) &&
    !row.guide_completed_at &&
    row.schedule_status !== "cancelled";

  return (
    <>
      <Card title="Моё расписание" className={styles.card}>
        <ParagraphIntro />
        <div className={styles.filters}>
          <Text>Период:</Text>
          <Select
            className={styles.filterSelect}
            value={period}
            onChange={(v) => setPeriod(v as GuideSchedulePeriod | "")}
            options={[
              { value: "", label: "Все даты" },
              { value: "today", label: "Сегодня" },
              { value: "week", label: "Ближайшая неделя" },
              { value: "month", label: "Ближайший месяц" },
            ]}
          />
          <Text>Статус сеанса:</Text>
          <Select
            className={styles.filterSelect}
            allowClear
            placeholder="Любой"
            value={scheduleStatus || undefined}
            onChange={(v) => setScheduleStatus(v ?? "")}
            options={Object.entries(scheduleStatusLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>

        <Table<GuideMyScheduleItem>
          rowKey="schedule_id"
          loading={loading || actionLoading}
          dataSource={items}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: "Нет назначенных сеансов" }}
          expandable={{
            expandedRowRender: (row) => (
              <div className={styles.nested}>
                <Text strong>Группы (бронирования)</Text>
                {row.bookings.length === 0 ? (
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    Пока нет бронирований по этому сеансу (кроме отменённых).
                  </Text>
                ) : (
                  <Table
                    size="small"
                    className={styles.nestedTable}
                    rowKey="booking_id"
                    pagination={false}
                    dataSource={row.bookings}
                    columns={[
                      { title: "Бронь №", dataIndex: "booking_id", width: 90 },
                      {
                        title: "Участников",
                        dataIndex: "participants_count",
                        width: 110,
                      },
                      {
                        title: "Статус брони",
                        render: (_, b) => (
                          <Tag>{bookingStatusLabels[b.status] ?? b.status}</Tag>
                        ),
                      },
                      {
                        title: "",
                        width: 160,
                        render: (_, b) => (
                          <Button type="link" onClick={() => openGroup(b.booking_id)}>
                            Состав группы
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            ),
            rowExpandable: () => true,
          }}
          columns={[
            {
              title: "Сеанс",
              width: 220,
              render: (_, row) => (
                <div>
                  <div>{formatDateTime(row.start_datetime)}</div>
                  <Text type="secondary" className={styles.subTime}>
                    до {formatDateTime(row.end_datetime)}
                  </Text>
                </div>
              ),
            },
            {
              title: "Мероприятие",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{row.event_title}</span>
                  <Link to={`/events/${row.event_id}`}>Страница мероприятия</Link>
                </Space>
              ),
            },
            {
              title: "Всего участников",
              width: 130,
              dataIndex: "participants_count",
            },
            {
              title: "Сеанс",
              width: 130,
              render: (_, row) => (
                <Tag>{scheduleStatusLabels[row.schedule_status] ?? row.schedule_status}</Tag>
              ),
            },
            {
              title: "Мой статус",
              width: 180,
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <span>{guideDecisionLabel(row)}</span>
                  {row.guide_reject_reason ? (
                    <Text type="secondary" className={styles.reason}>
                      {row.guide_reject_reason}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "Действия",
              width: 280,
              render: (_, row) => (
                <Space wrap size="small">
                  {canDecide(row) ? (
                    <>
                      <Button size="small" type="primary" onClick={() => onConfirm(row.schedule_id)}>
                        Подтвердить
                      </Button>
                      <Button size="small" danger onClick={() => openReject(row.schedule_id)}>
                        Отказаться
                      </Button>
                    </>
                  ) : null}
                  {canComplete(row) ? (
                    <Button size="small" onClick={() => onCompleted(row.schedule_id)}>
                      Проведена
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={group ? `Группа по брони №${group.booking_id}` : "Загрузка..."}
        open={groupOpen}
        onCancel={closeGroup}
        width={720}
        footer={<Button onClick={closeGroup}>Закрыть</Button>}
        destroyOnHidden
      >
        {groupLoading ? (
          <Text>Загрузка...</Text>
        ) : group ? (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Мероприятие">{group.event_title}</Descriptions.Item>
              <Descriptions.Item label="Сеанс">
                {formatDateTime(group.start_datetime)} — {formatDateTime(group.end_datetime)}
              </Descriptions.Item>
              <Descriptions.Item label="Заказчик">{group.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Email">{group.customer_email ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Телефон">{group.customer_phone ?? "—"}</Descriptions.Item>
            </Descriptions>
            <div>
              <Title level={5}>Участники</Title>
              <Table
                size="small"
                rowKey="participant_id"
                pagination={false}
                dataSource={group.participants}
                columns={[
                  { title: "Фамилия", dataIndex: "last_name" },
                  { title: "Имя", dataIndex: "first_name" },
                  { title: "Отчество", dataIndex: "patronymic", render: (v) => v ?? "—" },
                  { title: "Возраст", dataIndex: "age", render: (v) => v ?? "—" },
                  {
                    title: "Детский",
                    dataIndex: "is_child",
                    render: (v: boolean) => (v ? "да" : "нет"),
                  },
                ]}
              />
            </div>
          </Space>
        ) : null}
      </Modal>

      <Modal
        title="Отказ от проведения"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
        okText="Отправить"
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Укажите причину — администраторы получат уведомление.
        </Text>
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Не короче 3 символов"
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  );
}

function ParagraphIntro() {
  return (
    <p className={styles.intro}>
      Здесь назначенные вам сеансы и{" "}
      <strong>группы</strong> (отдельные бронирования). Состав группы доступен после вашего подтверждения
      и не ранее чем за час до начала.
    </p>
  );
}
