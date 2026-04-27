import { Spin, Typography, message } from "antd";
import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";
import { getApiErrorDetail } from "../utils/apiError";

const { Text } = Typography;

export default function VkAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      message.error("VK не вернул код авторизации");
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.vkExchange({ code, state });
        if (cancelled) return;
        await loginWithToken(data.access_token);
        const redirect = "/profile";
        navigate(redirect, { replace: true });
        message.success("Вход через VK выполнен");
      } catch (e) {
        if (cancelled) return;
        message.error(getApiErrorDetail(e));
        navigate("/login", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loginWithToken, navigate, searchParams]);

  if (user) return <Navigate to="/profile" replace />;

  return (
    <div style={{ textAlign: "center", padding: 48 }}>
      <Spin size="large" />
      <div style={{ marginTop: 12 }}>
        <Text type="secondary">Завершаем вход через VK...</Text>
      </div>
    </div>
  );
}
