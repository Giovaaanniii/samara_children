import { Card, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import type { EventRecord } from "../types";
import { formatDate } from "../utils/formatDate";

import styles from "./EventCard.module.css";

const { Paragraph, Text } = Typography;

type Props = {
  event: EventRecord;
};

const categoryLabels: Record<EventRecord["category"], string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

export function EventCard({ event }: Props) {
  const cover = event.cover_image_url;

  return (
    <Link to={`/events/${event.id}`} className={styles.cardLink}>
      <Card className={styles.card} hoverable bordered={false}>
        <div className={styles.cover}>
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <span className={styles.coverPlaceholder}>Самара детям</span>
          )}
        </div>
        <div className={styles.body}>
          <Tag color="red" bordered={false}>
            {categoryLabels[event.category]}
          </Tag>
          <Typography.Title level={5} style={{ marginTop: 8, marginBottom: 4 }}>
            <span className={styles.titleLink}>{event.title}</span>
          </Typography.Title>
          {event.target_audience && (
            <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
              {event.target_audience}
            </Paragraph>
          )}
          <Text className={styles.price}>от {event.base_price} ₽</Text>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>
            обновлено {formatDate(event.updated_at)}
          </Paragraph>
        </div>
      </Card>
    </Link>
  );
}
