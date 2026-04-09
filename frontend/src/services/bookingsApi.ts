import type {
  BookingCancelResponse,
  BookingCreate,
  BookingDetail,
  BookingResponse,
  BookingStatusSnapshot,
} from "../types";

import { api } from "./api";

export type BookingStatusFilter =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export const bookingsApi = {
  create: (body: BookingCreate) =>
    api.post<BookingResponse>("/bookings", body),

  my: (status?: BookingStatusFilter) =>
    api.get<BookingResponse[]>("/bookings/my", {
      params: status ? { status } : undefined,
    }),

  getById: (id: number) => api.get<BookingDetail>(`/bookings/${id}`),

  /** Опрос статуса после редиректа с оплаты (без тяжёлых связей) */
  getStatus: (id: number) =>
    api.get<BookingStatusSnapshot>(`/bookings/${id}/status`),

  cancel: (id: number) =>
    api.post<BookingCancelResponse>(`/bookings/${id}/cancel`),
};
