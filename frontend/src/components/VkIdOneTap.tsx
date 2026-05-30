import * as VKID from "@vkid/sdk";
// OAuthName есть в runtime-бандле SDK, в .d.ts корня пакета не экспортируется
import { OAuthName } from "@vkid/sdk";
import { message } from "antd";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID || "54616810");

interface VkIdOneTapProps {
  redirectTo?: string;
}

function vkIdErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      error_description?: string;
      error?: string;
      message?: string;
    };
    return (
      e.error_description ||
      e.error ||
      e.message ||
      "Ошибка авторизации VK ID"
    );
  }
  return "Ошибка авторизации VK ID";
}

export default function VkIdOneTap({ redirectTo = "/profile" }: VkIdOneTapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const safeRedirect = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
    const redirectUrl =
      import.meta.env.VITE_VK_REDIRECT_URL ||
      `${window.location.origin}${safeRedirect}`;

    VKID.Config.init({
      app: VK_APP_ID,
      redirectUrl,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: "email",
    });

    const oneTap = new VKID.OneTap();

    const vkidOnSuccess = async (data: Omit<VKID.TokenResult, "id_token">) => {
      try {
        const { data: tokens } = await authApi.vkIdSession({
          access_token: data.access_token,
        });
        await loginWithToken(tokens.access_token);
        message.success("Вход через VK выполнен");
        navigate(safeRedirect, { replace: true });
      } catch {
        message.error("Не удалось завершить вход через VK");
      }
    };

    const vkidOnError = (error: unknown) => {
      console.error("VK ID:", error);
      message.error(vkIdErrorMessage(error));
    };

    oneTap
      .render({
        container,
        showAlternativeLogin: true,
        oauthList: [OAuthName.MAIL],
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
      container.replaceChildren();
    };
  }, [redirectTo, navigate, loginWithToken]);

  return <div ref={containerRef} />;
}
