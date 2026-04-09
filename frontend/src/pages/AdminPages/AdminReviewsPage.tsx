import { DeleteOutlined } from "@ant-design/icons";
import { Button, Popconfirm, Rate, Table, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { reviewsApi } from "../../services/reviewsApi";
import type { ReviewAdminItem } from "../../types";
import { getApiErrorDetail } from "../../utils/apiError";
import { formatDateTime } from "../../utils/formatDate";

import styles from "./AdminReviewsPage.module.css";

const { Title, Paragraph, Text } = Typography;

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<ReviewAdminItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reviewsApi.adminListAll();
      setRows(res.data);
    } catch (e) {
      message.error(getApiErrorDetail(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: number) => {
    try {
      await reviewsApi.remove(id);
      message.success("Отзыв удалён");
      await load();
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  const columns: ColumnsType<ReviewAdminItem> = [
    { title: "ID", dataIndex: "id", width: 56, fixed: "left" },
    {
      title: "Мероприятие",
      dataIndex: "event_title",
      width: 200,
      ellipsis: true,
      render: (t: string, r) => <Link to={`/events/${r.event_id}`}>{t}</Link>,
    },
    {
      title: "Автор",
      dataIndex: "author_name",
      width: 120,
      ellipsis: true,
      render: (v: string | null | undefined) => v ?? "—",
    },
    {
      title: "Общая",
      key: "avg",
      width: 120,
      align: "left",
      render: (_, r) => {
        const v = r.average_rating ?? r.rating;
        return (
          <div className={styles.overallBox}>
            <div className={styles.starsLine}>
              <Rate
                disabled
                allowHalf
                value={v}
                className={styles.compactRate}
              />
            </div>
            <Text type="secondary" className={styles.scoreHint}>
              {v.toFixed(1)} / 5
            </Text>
          </div>
        );
      },
    },
    {
      title: "Критерии",
      key: "crit",
      width: 260,
      render: (_, r) => (
        <div className={styles.critBlock}>
          <div className={styles.critRow}>
            <span className={styles.critLabel}>Гид</span>
            <Rate
              disabled
              value={r.guide_rating ?? 0}
              className={styles.critStars}
            />
          </div>
          <div className={styles.critRow}>
            <span className={styles.critLabel}>Вовлечённость</span>
            <Rate
              disabled
              value={r.engagement_rating ?? 0}
              className={styles.critStars}
            />
          </div>
          <div className={styles.critRow}>
            <span className={styles.critLabel}>Организация</span>
            <Rate
              disabled
              value={r.organization_rating ?? 0}
              className={styles.critStars}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Комментарий",
      dataIndex: "comment",
      ellipsis: true,
      width: 160,
      render: (c: string | null) => c || "—",
    },
    {
      title: "Дата",
      dataIndex: "created_at",
      width: 158,
      render: (d: string) => formatDateTime(d),
    },
    {
      title: "",
      key: "actions",
      width: 108,
      fixed: "right",
      render: (_, r) => (
        <Popconfirm
          title="Удалить отзыв без восстановления?"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => void onDelete(r.id)}
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            Удалить
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        Отзывы
      </Title>
      <Paragraph type="secondary">
        Модерация: удалённые отзывы исчезают с карточек мероприятий.
      </Paragraph>
      <Table<ReviewAdminItem>
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1100 }}
        tableLayout="fixed"
        pagination={{ pageSize: 15, showSizeChanger: true }}
      />
    </div>
  );
}
