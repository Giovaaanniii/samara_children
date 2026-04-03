import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input, Typography, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import { loginSchema, type LoginFormValues } from "../utils/validation";

const { Title } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const login = useAuthStore((s) => s.login);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.login, values.password);
      message.success("Вход выполнен");
      navigate(redirect, { replace: true });
    } catch {
      message.error("Неверный логин или пароль");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "48px auto", padding: 16 }}>
      <Title level={3} style={{ textAlign: "center" }}>
        Вход
      </Title>
      <Form layout="vertical">
        <Form.Item
          label="Логин или email"
          validateStatus={errors.login ? "error" : undefined}
          help={errors.login?.message}
        >
          <Controller
            name="login"
            control={control}
            render={({ field }) => <Input autoComplete="username" {...field} />}
          />
        </Form.Item>
        <Form.Item
          label="Пароль"
          validateStatus={errors.password ? "error" : undefined}
          help={errors.password?.message}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password autoComplete="current-password" {...field} />
            )}
          />
        </Form.Item>
        <Button
          type="primary"
          htmlType="button"
          loading={isSubmitting}
          block
          onClick={handleSubmit(onSubmit)}
        >
          Войти
        </Button>
      </Form>
      <Typography.Paragraph style={{ textAlign: "center", marginTop: 16 }}>
        Нет аккаунта?{" "}
        <Link
          to={
            redirect !== "/profile"
              ? `/register?redirect=${encodeURIComponent(redirect)}`
              : "/register"
          }
        >
          Зарегистрироваться
        </Link>
      </Typography.Paragraph>
    </div>
  );
}
