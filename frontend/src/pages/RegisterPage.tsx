import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input, Typography, message } from "antd";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import {
  registerSchema,
  type RegisterFormValues,
} from "../utils/validation";
import { getApiErrorDetail } from "../utils/apiError";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/profile";
  const register = useAuthStore((s) => s.register);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      login: "",
      email: "",
      password: "",
      password2: "",
      first_name: "",
      last_name: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await register({
        login: values.login.trim(),
        email: values.email.trim(),
        password: values.password,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
      });
      message.success("Регистрация выполнена");
      navigate(redirect, { replace: true });
    } catch (e) {
      message.error(getApiErrorDetail(e));
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "48px auto", padding: 16 }}>
      <Title level={3} style={{ textAlign: "center" }}>
        Регистрация
      </Title>
      <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
        Создайте аккаунт, чтобы бронировать мероприятия
      </Text>
      <Form layout="vertical">
        <Form.Item
          label="Логин"
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
          label="Email"
          validateStatus={errors.email ? "error" : undefined}
          help={errors.email?.message}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input type="email" autoComplete="email" {...field} />}
          />
        </Form.Item>
        <Form.Item
          label="Имя"
          validateStatus={errors.first_name ? "error" : undefined}
          help={errors.first_name?.message}
        >
          <Controller
            name="first_name"
            control={control}
            render={({ field }) => <Input autoComplete="given-name" {...field} />}
          />
        </Form.Item>
        <Form.Item
          label="Фамилия"
          validateStatus={errors.last_name ? "error" : undefined}
          help={errors.last_name?.message}
        >
          <Controller
            name="last_name"
            control={control}
            render={({ field }) => <Input autoComplete="family-name" {...field} />}
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
              <Input.Password autoComplete="new-password" {...field} />
            )}
          />
        </Form.Item>
        <Form.Item
          label="Повтор пароля"
          validateStatus={errors.password2 ? "error" : undefined}
          help={errors.password2?.message}
        >
          <Controller
            name="password2"
            control={control}
            render={({ field }) => (
              <Input.Password autoComplete="new-password" {...field} />
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
          Зарегистрироваться
        </Button>
      </Form>
      <Text style={{ display: "block", textAlign: "center", marginTop: 16 }}>
        Уже есть аккаунт?{" "}
        <Link
          to={
            redirect !== "/profile"
              ? `/login?redirect=${encodeURIComponent(redirect)}`
              : "/login"
          }
        >
          Войти
        </Link>
      </Text>
    </div>
  );
}
