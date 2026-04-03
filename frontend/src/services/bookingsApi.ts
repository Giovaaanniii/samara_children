import type {
  BookingCancelResponse,
  BookingCreate,
  BookingDetail,
  BookingResponse,
} from "../types";

import { api } from "./api";

export type BookingStatusFilter =
  | "draft"
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

  cancel: (id: number) =>
    api.post<BookingCancelResponse>(`/bookings/${id}/cancel`),
};
