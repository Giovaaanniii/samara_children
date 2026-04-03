import { isAxiosError } from "axios";

export function getApiErrorDetail(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    const detail = data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: string }).msg) : String(d)))
        .join(", ");
    }
  }
  if (error instanceof Error) return error.message;
  return "Произошла ошибка";
}
