import { Typography } from "antd";

const { Title, Paragraph } = Typography;

/** Заготовка раздела администратора (маршруты и права — позже). */
export default function AdminPages() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Администрирование</Title>
      <Paragraph type="secondary">
        Здесь будут экраны управления мероприятиями, сеансами и заявками.
      </Paragraph>
    </div>
  );
}
