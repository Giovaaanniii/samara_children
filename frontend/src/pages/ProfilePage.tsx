import { Card, Spin, Typography } from "antd";

import { useAuthStore } from "../store/authStore";

const { Title, Paragraph } = Typography;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Paragraph type="warning" style={{ padding: 24 }}>
        Войдите в систему, чтобы видеть профиль.
      </Paragraph>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
      <Title level={3}>Профиль</Title>
      <Card>
        <p>
          <strong>Логин:</strong> {user.login}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Роль:</strong> {user.role}
        </p>
      </Card>
    </div>
  );
}
