import { Alert, Spin } from "antd";
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";

type Props = {
  children: ReactElement;
};

export default function AdminRoute({ children }: Props) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/admin/events" replace />;
  if (user.role !== "admin") {
    return (
      <div style={{ maxWidth: 760, margin: "24px auto" }}>
        <Alert
          type="error"
          showIcon
          message="Недостаточно прав"
          description="Этот раздел доступен только администраторам."
        />
      </div>
    );
  }
  return children;
}
