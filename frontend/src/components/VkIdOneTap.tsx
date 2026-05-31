import * as VKID from "@vkid/sdk";
import { App } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

import styles from "./VkIdOneTap.module.css";

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID || "54616810");

declare global {
  interface Window {
    __vkIdConfigured?: boolean;
    __vkIdOneTapHost?: HTMLDivElement | null;
  }
}

interface VkIdOneTapProps {
  redirectTo?: string;
}

function isBenignVkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: number; text?: string };
  if (e.code === 0 && e.text === "timeout") return true;
  if (e.code === 2 && e.text === "New tab has been closed") return true;
  if (e.text?.toLowerCase().includes("tab has been closed")) return true;
  return false;
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

function clearVkHost(host: HTMLDivElement) {
  host.replaceChildren();
  if (window.__vkIdOneTapHost === host) {
    window.__vkIdOneTapHost = null;
  }
}

export default function VkIdOneTap({ redirectTo = "/profile" }: VkIdOneTapProps) {
  const { message } = App.useApp();
  const hostRef = useRef<HTMLDivElement>(null);
  const destroyedRef = useRef(false);
  const navigate = useNavigate();
  const loginWithToken = useAuthStore((s) => s.loginWithToken);

  const redirectRef = useRef(redirectTo);
  const loginWithTokenRef = useRef(loginWithToken);
  const navigateRef = useRef(navigate);
  const messageRef = useRef<MessageInstance>(message);
  redirectRef.current = redirectTo;
  loginWithTokenRef.current = loginWithToken;
  navigateRef.current = navigate;
  messageRef.current = message;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (window.__vkIdOneTapHost === host && host.childElementCount > 0) {
      return;
    }

    destroyedRef.current = false;
    clearVkHost(host);
    window.__vkIdOneTapHost = host;

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
        scope: "",
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
        messageRef.current.success("Вход через VK выполнен");
        navigateRef.current(safeRedirect, { replace: true });
      } catch {
        messageRef.current.error("Не удалось завершить вход через VK");
      }
    };

    const vkidOnError = (error: unknown) => {
      if (destroyedRef.current || isBenignVkError(error)) return;
      console.warn("VK ID:", error);
      messageRef.current.error(vkIdErrorMessage(error));
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
      clearVkHost(host);
    };
  }, []);

  return (
    <div className={styles.host} ref={hostRef} aria-label="Вход через VK ID" />
  );
}
