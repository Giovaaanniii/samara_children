import * as VKID from "@vkid/sdk";
import { message } from "antd";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

import styles from "./VkIdOneTap.module.css";

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID || "54616810");

declare global {
  interface Window {
    __vkIdConfigured?: boolean;
  }
}

interface VkIdOneTapProps {
  redirectTo?: string;
}

function vkIdErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      code?: number;
      text?: string;
      error_description?: string;
      error?: string;
      message?: string;
    };
    if (e.code === 0 && e.text === "timeout") {
      return "Виджет VK ID не загрузился. Проверьте интернет и настройки приложения VK ID.";
    }
    return (
      e.text ||
      e.error_description ||
      e.error ||
      e.message ||
      "Ошибка авторизации VK ID"
    );
  }
  return "Ошибка авторизации VK ID";
}

export default function VkIdOneTap({ redirectTo = "/profile" }: VkIdOneTapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const navigate = useNavigate();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  const redirectRef = useRef(redirectTo);
  const loginWithTokenRef = useRef(loginWithToken);
  const navigateRef = useRef(navigate);
  redirectRef.current = redirectTo;
  loginWithTokenRef.current = loginWithToken;
  navigateRef.current = navigate;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    destroyedRef.current = false;

    const safeRedirect = redirectRef.current.startsWith("/")
      ? redirectRef.current
      : `/${redirectRef.current}`;
    const redirectUrl =
      import.meta.env.VITE_VK_REDIRECT_URL ||
      `${window.location.origin}${safeRedirect}`;

    if (!window.__vkIdConfigured) {
      VKID.Config.init({
        app: VK_APP_ID,
        redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "email",
      });
      window.__vkIdConfigured = true;
    }

    const oneTap = new VKID.OneTap();

    const vkidOnSuccess = async (data: Omit<VKID.TokenResult, "id_token">) => {
      if (destroyedRef.current) return;
      try {
        const { data: tokens } = await authApi.vkIdSession({
          access_token: data.access_token,
        });
        await loginWithTokenRef.current(tokens.access_token);
        message.success("Вход через VK выполнен");
        navigateRef.current(safeRedirect, { replace: true });
      } catch {
        message.error("Не удалось завершить вход через VK");
      }
    };

    const vkidOnError = (error: unknown) => {
      if (destroyedRef.current) return;
      console.error("VK ID:", error);
      message.error(vkIdErrorMessage(error));
    };

    oneTap
      .render({
        container: host,
        showAlternativeLogin: true,
      })
      .on(VKID.WidgetEvents.ERROR, vkidOnError)
      .on(
        VKID.OneTapInternalEvents.LOGIN_SUCCESS,
        (payload: VKID.AuthResponse) => {
          VKID.Auth.exchangeCode(payload.code, payload.device_id)
            .then(vkidOnSuccess)
            .catch(vkidOnError);
        },
      );

    return () => {
      destroyedRef.current = true;
    };
  }, []);

  return (
    <div className={styles.host} ref={hostRef} aria-label="Вход через VK ID" />
  );
}
