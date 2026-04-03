import { Card, Typography } from "antd";
import { useEffect, useState } from "react";

import { authApi } from "../services/authApi";
import type { User } from "../types";

const { Title, Paragraph } = Typography;

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.me();
        if (!cancelled) setUser(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Нужна авторизация");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <Paragraph type="danger" style={{ padding: 24 }}>
        {error}
      </Paragraph>
    );
  }

  if (!user) {
    return <Paragraph style={{ padding: 24 }}>Загрузка…</Paragraph>;
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
