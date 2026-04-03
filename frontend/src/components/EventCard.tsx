import { Card, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

import type { EventRecord } from "../types";

import { formatDate } from "../utils/formatDate";

const { Paragraph, Title } = Typography;

type Props = {
  event: EventRecord;
};

const categoryLabels: Record<EventRecord["category"], string> = {
  excursion: "Экскурсия",
  quest: "Квест",
  workshop: "Мастер-класс",
};

export function EventCard({ event }: Props) {
  return (
    <Card hoverable>
      <Tag color="blue">{categoryLabels[event.category]}</Tag>
      <Title level={4} style={{ marginTop: 8 }}>
        <Link to={`/events/${event.id}`}>{event.title}</Link>
      </Title>
      {event.target_audience && (
        <Paragraph type="secondary" ellipsis>
          {event.target_audience}
        </Paragraph>
      )}
      <Paragraph>
        от {event.base_price} ₽ · обновлено {formatDate(event.updated_at)}
      </Paragraph>
    </Card>
  );
}
